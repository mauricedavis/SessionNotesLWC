import { LightningElement, api, track, wire } from 'lwc';
import { getRecord, getFieldValue, createRecord } from 'lightning/uiRecordApi';
import { getPicklistValues, getObjectInfo } from 'lightning/uiObjectInfoApi';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

// Session object & fields
import SESSION_OBJECT             from '@salesforce/schema/Session__c';
import SESSION_DATE_TIME_FIELD    from '@salesforce/schema/Session__c.Session_Date_Time__c';
import SESSION_SITE_FIELD         from '@salesforce/schema/Session__c.Session_Site__c';
import AREA_COUNSELING_FIELD      from '@salesforce/schema/Session__c.Area_of_Counseling__c';
import SESSION_TYPE_FIELD         from '@salesforce/schema/Session__c.Session_Type__c';
import DELIVERY_TYPE_FIELD        from '@salesforce/schema/Session__c.Delivery_Type__c';
import BUSINESS_STATUS_FIELD      from '@salesforce/schema/Session__c.Business_Status_for_Session__c';
import CONTACT_HOURS_FIELD        from '@salesforce/schema/Session__c.Contact_Hours__c';
import PREP_HOURS_FIELD           from '@salesforce/schema/Session__c.Prep_Hours__c';
import TRAVEL_HOURS_FIELD         from '@salesforce/schema/Session__c.Travel_Hours__c';
import TRAVEL_DISTANCE_FIELD      from '@salesforce/schema/Session__c.Travel_Distance__c';
import VERIFIED_FIELD             from '@salesforce/schema/Session__c.Verified__c';
import EXPORTING_FIELD            from '@salesforce/schema/Session__c.Exporting__c';
import PROGRAM_FUNDING_FIELD      from '@salesforce/schema/Session__c.Program_Funding__c';
import SUB_PROGRAM_FIELD          from '@salesforce/schema/Session__c.Sub_program__c';
import LANGUAGE_FIELD             from '@salesforce/schema/Session__c.Language__c';
import LANGUAGE_OTHER_FIELD       from '@salesforce/schema/Session__c.Language_Other__c';
import NOTES_FIELD                from '@salesforce/schema/Session__c.Notes__c';
import ACCOUNT_FIELD              from '@salesforce/schema/Session__c.Account__c';
import CASE_FIELD                 from '@salesforce/schema/Session__c.Case__c';
import CONTACT_FIELD              from '@salesforce/schema/Session__c.Contact__c';
import IMPACT_FIELD               from '@salesforce/schema/Session__c.Impact__c';
import PRIMARY_CONSULTANT_FIELD   from '@salesforce/schema/Session__c.Primary_Consultant__c';

// Case fields
import CASE_ACCOUNT_ID    from '@salesforce/schema/Case.AccountId';
import CASE_ACCOUNT_NAME  from '@salesforce/schema/Case.Account_Name__c';
import CASE_CONTACT_ID    from '@salesforce/schema/Case.ContactId';
import CASE_NUMBER        from '@salesforce/schema/Case.CaseNumber';
import CASE_ERFC          from '@salesforce/schema/Case.eRFC_Complete__c';

// Impact (Opportunity) fields
import IMPACT_ACCOUNT_ID  from '@salesforce/schema/Opportunity.AccountId';
import IMPACT_CASE_ID     from '@salesforce/schema/Opportunity.Case__c';
import IMPACT_CONTACT_ID  from '@salesforce/schema/Opportunity.Client_Contact__c';

// Account fields (for Impact context)
import ACCOUNT_NAME_FIELD  from '@salesforce/schema/Account.Name';
import ACCOUNT_IN_BUSINESS from '@salesforce/schema/Account.In_Business__c';
import ACCOUNT_START_DATE  from '@salesforce/schema/Account.Start_Date__c';

// Case fields re-used when loaded via Impact
import CASE_NUMBER_FROM_IMPACT from '@salesforce/schema/Case.CaseNumber';
import CASE_ERFC_FROM_IMPACT   from '@salesforce/schema/Case.eRFC_Complete__c';

// Current user
import USER_ID         from '@salesforce/user/Id';
import USER_FIRSTNAME  from '@salesforce/schema/User.FirstName';
import USER_LASTNAME   from '@salesforce/schema/User.LastName';
import USER_CENTER_REGION from '@salesforce/schema/User.Center_Region__c';

export default class SbdcNewSession extends NavigationMixin(LightningElement) {

    @api recordId;   // Case ID or Impact (Opportunity) ID

    // ─── Context ─────────────────────────────────────────────────────────────
    // Set via targetConfig property in the Quick Action / page config.
    // Defaults to 'Case'. Set to 'Impact' when used on an Impact record.
    _context = 'Case';
    @api
    get context() { return this._context; }
    set context(val) { this._context = val; }

    // ─── UI State ────────────────────────────────────────────────────────────
    @track currentStep = 1;
    @track isLoading   = true;
    @track isSaving    = false;
    @track isSaved     = false;
    @track pageError   = null;
    @track step1Error  = null;
    @track saveError   = null;
    @track savedSessionId = null;

    // ─── Context data ────────────────────────────────────────────────────────
    @track accountId   = null;
    @track accountName = '';
    @track caseId      = null;
    @track caseNumber  = '';
    @track contactId   = null;
    @track impactId    = null;
    @track erFCComplete = false;

    // ─── User ────────────────────────────────────────────────────────────────
    userId = USER_ID;
    @track consultantName   = '';
    @track userCenterRegion = '';

    // ─── Form fields ─────────────────────────────────────────────────────────
    @track sessionDateTime     = this._nowLocal();
    @track sessionSite         = '';
    @track areaOfCounseling    = '';
    @track sessionType         = '';
    @track deliveryType        = '';
    @track businessStatus      = '';
    @track contactHours        = 0;
    @track prepHours           = 0;
    @track travelHours         = 0;
    @track travelDistance      = 0;
    @track verified            = false;
    @track exporting           = false;
    @track programFunding      = 'SBDC';
    @track subProgram          = '';
    @track language            = 'English';
    @track languageOther       = '';
    @track notes               = '';
    @track showNotesGuidelines = false;

    // ─── Picklist options ────────────────────────────────────────────────────
    @track areaOfCounselingOptions = [];
    @track sessionTypeOptions      = [];
    @track deliveryTypeOptions     = [];
    @track businessStatusOptions   = [];
    @track programFundingOptions   = [];
    @track subProgramOptions       = [];
    @track languageOptions         = [];

    // ─── Wire: Session object info ───────────────────────────────────────────
    @wire(getObjectInfo, { objectApiName: SESSION_OBJECT })
    sessionObjectInfo;

    get sessionRecordTypeId() {
        if (!this.sessionObjectInfo || !this.sessionObjectInfo.data) return null;
        const rtInfos = this.sessionObjectInfo.data.recordTypeInfos;
        const master  = Object.values(rtInfos).find(rt => rt.master);
        return master ? master.recordTypeId : null;
    }

    @wire(getPicklistValues, { recordTypeId: '$sessionRecordTypeId', fieldApiName: AREA_COUNSELING_FIELD })
    wiredAreaOfCounseling({ data }) { if (data) this.areaOfCounselingOptions = this._toOptions(data.values); }

    @wire(getPicklistValues, { recordTypeId: '$sessionRecordTypeId', fieldApiName: SESSION_TYPE_FIELD })
    wiredSessionType({ data }) { if (data) this.sessionTypeOptions = this._toOptions(data.values); }

    @wire(getPicklistValues, { recordTypeId: '$sessionRecordTypeId', fieldApiName: DELIVERY_TYPE_FIELD })
    wiredDeliveryType({ data }) { if (data) this.deliveryTypeOptions = this._toOptions(data.values); }

    @wire(getPicklistValues, { recordTypeId: '$sessionRecordTypeId', fieldApiName: BUSINESS_STATUS_FIELD })
    wiredBusinessStatus({ data }) { if (data) this.businessStatusOptions = this._toOptions(data.values); }

    @wire(getPicklistValues, { recordTypeId: '$sessionRecordTypeId', fieldApiName: PROGRAM_FUNDING_FIELD })
    wiredProgramFunding({ data }) { if (data) this.programFundingOptions = this._toOptions(data.values); }

    @wire(getPicklistValues, { recordTypeId: '$sessionRecordTypeId', fieldApiName: SUB_PROGRAM_FIELD })
    wiredSubProgram({ data }) { if (data) this.subProgramOptions = this._toOptions(data.values); }

    @wire(getPicklistValues, { recordTypeId: '$sessionRecordTypeId', fieldApiName: LANGUAGE_FIELD })
    wiredLanguage({ data }) { if (data) this.languageOptions = this._toOptions(data.values); }

    // ─── Wire: Current user ──────────────────────────────────────────────────
    @wire(getRecord, { recordId: '$userId', fields: [USER_FIRSTNAME, USER_LASTNAME, USER_CENTER_REGION] })
    wiredUser({ data }) {
        if (data) {
            const fn = getFieldValue(data, USER_FIRSTNAME) || '';
            const ln = getFieldValue(data, USER_LASTNAME)  || '';
            this.consultantName   = `${fn} ${ln}`.trim();
            this.userCenterRegion = getFieldValue(data, USER_CENTER_REGION) || '';
            this._applySubProgramDefault();
        }
    }

    // ─── Wire: Case record (Case context) ───────────────────────────────────
    @wire(getRecord, {
        recordId: '$_caseWireId',
        fields: [CASE_ACCOUNT_ID, CASE_ACCOUNT_NAME, CASE_CONTACT_ID, CASE_NUMBER, CASE_ERFC]
    })
    wiredCase({ data, error }) {
        if (data && this._context === 'Case') {
            this.accountId   = getFieldValue(data, CASE_ACCOUNT_ID)   || null;
            this.accountName = getFieldValue(data, CASE_ACCOUNT_NAME) || '';
            this.contactId   = getFieldValue(data, CASE_CONTACT_ID)   || null;
            this.caseNumber  = getFieldValue(data, CASE_NUMBER)        || '';
            this.erFCComplete = getFieldValue(data, CASE_ERFC)         || false;
            this.caseId      = this.recordId;
            this.isLoading   = false;
        } else if (error && this._context === 'Case') {
            this.pageError = 'Unable to load Case record.';
            this.isLoading = false;
        }
    }

    get _caseWireId() {
        return this._context === 'Case' ? this.recordId : null;
    }

    // ─── Wire: Impact (Opportunity) record ──────────────────────────────────
    @wire(getRecord, {
        recordId: '$_impactWireId',
        fields: [IMPACT_ACCOUNT_ID, IMPACT_CASE_ID, IMPACT_CONTACT_ID]
    })
    wiredImpact({ data, error }) {
        if (data && this._context === 'Impact') {
            this.accountId = getFieldValue(data, IMPACT_ACCOUNT_ID) || null;
            this.caseId    = getFieldValue(data, IMPACT_CASE_ID)    || null;
            this.contactId = getFieldValue(data, IMPACT_CONTACT_ID) || null;
            this.impactId  = this.recordId;
            // Account name + business status loaded via wiredAccount below
        } else if (error && this._context === 'Impact') {
            this.pageError = 'Unable to load Impact record.';
            this.isLoading = false;
        }
    }

    get _impactWireId() {
        return this._context === 'Impact' ? this.recordId : null;
    }

    // ─── Wire: Account (Impact context) ─────────────────────────────────────
    @wire(getRecord, {
        recordId: '$accountId',
        fields: [ACCOUNT_NAME_FIELD, ACCOUNT_IN_BUSINESS, ACCOUNT_START_DATE]
    })
    wiredAccount({ data }) {
        if (data && this.accountId) {
            this.accountName = getFieldValue(data, ACCOUNT_NAME_FIELD) || '';
            const inBiz  = getFieldValue(data, ACCOUNT_IN_BUSINESS);
            const start  = getFieldValue(data, ACCOUNT_START_DATE);
            if (inBiz && start && new Date(start) <= new Date()) {
                this.businessStatus = 'In Business';
            }
            if (this._context === 'Impact') this.isLoading = false;
        }
    }

    // ─── Wire: Case via Impact (eRFC + case number) ──────────────────────────
    @wire(getRecord, {
        recordId: '$caseId',
        fields: [CASE_NUMBER_FROM_IMPACT, CASE_ERFC_FROM_IMPACT]
    })
    wiredCaseViaImpact({ data }) {
        if (data && this._context === 'Impact' && this.caseId) {
            this.caseNumber   = getFieldValue(data, CASE_NUMBER_FROM_IMPACT)  || '';
            this.erFCComplete = getFieldValue(data, CASE_ERFC_FROM_IMPACT)    || false;
        }
    }

    // ─── Sub-program auto-assign from user Center Region ────────────────────
    _applySubProgramDefault() {
        const region = this.userCenterRegion;
        if (region === 'Tech Center')               this.subProgram = 'Tech Consultant';
        else if (region === 'Growth Center')         this.subProgram = 'G2';
        else if (region === 'SBSH Consulting Team Region') this.subProgram = 'SSBCI';
    }

    // ─── Step getters ────────────────────────────────────────────────────────
    get isStep1() { return this.currentStep === 1 && !this.isSaved; }
    get isStep2() { return this.currentStep === 2 && !this.isSaved; }

    get stepClass1() { return this._stepClass(1); }
    get stepClass2() { return this._stepClass(2); }

    _stepClass(n) {
        if (n < this.currentStep)   return 'step-item step-done';
        if (n === this.currentStep) return 'step-item step-active';
        return 'step-item step-future';
    }

    // ─── Display helpers ─────────────────────────────────────────────────────
    get sessionDateTimeFormatted() {
        if (!this.sessionDateTime) return '—';
        try {
            return new Date(this.sessionDateTime).toLocaleString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
                hour: 'numeric', minute: '2-digit', hour12: true
            });
        } catch(e) { return this.sessionDateTime; }
    }

    get sessionSiteDisplay() {
        return this.sessionSite || '—';
    }

    // ─── Event handlers ──────────────────────────────────────────────────────
    handleDateTimeChange(event) {
        this.sessionDateTime = event.target.value;
    }

    handleFieldChange(event) {
        this[event.target.dataset.field] = event.target.value;
    }

    handleHoursChange(event) {
        this[event.target.dataset.field] = parseFloat(event.target.value) || 0;
    }

    handleCheckboxChange(event) {
        this[event.target.dataset.field] = event.target.checked;
    }

    handleGuidelinesToggle(event) {
        this.showNotesGuidelines = event.target.checked;
    }

    handleNotesChange(event) {
        this.notes = event.target.value;
    }

    // ─── Navigation ──────────────────────────────────────────────────────────
    goToStep1() {
        this.currentStep = 1;
        this.step1Error  = null;
    }

    goToStep2() {
        this.step1Error = null;
        if (!this._validateStep1()) return;
        this.currentStep = 2;
        this.saveError   = null;
    }

    // ─── Validation ──────────────────────────────────────────────────────────
    _validateStep1() {
        if (!this.sessionDateTime) {
            this.step1Error = 'Session Date & Time is required.'; return false;
        }
        if (!this.areaOfCounseling) {
            this.step1Error = 'Area of Counseling is required.'; return false;
        }
        if (!this.sessionType) {
            this.step1Error = 'Session Type is required.'; return false;
        }
        if (!this.deliveryType) {
            this.step1Error = 'Delivery Type is required.'; return false;
        }
        if (!this.businessStatus) {
            this.step1Error = 'Business Status is required.'; return false;
        }
        if (!this.language) {
            this.step1Error = 'Language is required.'; return false;
        }
        if (this.sessionType === 'Counseling: Initial' && this.contactHours < 0.5) {
            this.step1Error = 'Initial Counseling Sessions require at least 0.5 Contact Hours.'; return false;
        }
        if (this.contactHours > 8) {
            this.step1Error = 'Contact Hours cannot exceed 8.'; return false;
        }
        if (this.prepHours > 8) {
            this.step1Error = 'Prep Hours cannot exceed 8.'; return false;
        }
        if (!this.notes || this.notes.replace(/<[^>]*>/g, '').trim() === '') {
            this.step1Error = 'Notes are required.'; return false;
        }
        return true;
    }

    // ─── Save ─────────────────────────────────────────────────────────────────
    async handleSave() {
        this.saveError = null;
        this.isSaving  = true;

        try {
            const fields = {
                [SESSION_DATE_TIME_FIELD.fieldApiName]  : this.sessionDateTime,
                [AREA_COUNSELING_FIELD.fieldApiName]    : this.areaOfCounseling,
                [SESSION_TYPE_FIELD.fieldApiName]       : this.sessionType,
                [DELIVERY_TYPE_FIELD.fieldApiName]      : this.deliveryType,
                [BUSINESS_STATUS_FIELD.fieldApiName]    : this.businessStatus,
                [CONTACT_HOURS_FIELD.fieldApiName]      : this.contactHours,
                [PREP_HOURS_FIELD.fieldApiName]         : this.prepHours,
                [TRAVEL_HOURS_FIELD.fieldApiName]       : this.travelHours,
                [TRAVEL_DISTANCE_FIELD.fieldApiName]    : this.travelDistance,
                [VERIFIED_FIELD.fieldApiName]           : this.verified,
                [EXPORTING_FIELD.fieldApiName]          : this.exporting,
                [PROGRAM_FUNDING_FIELD.fieldApiName]    : this.programFunding,
                [LANGUAGE_FIELD.fieldApiName]           : this.language,
                [NOTES_FIELD.fieldApiName]              : this.notes,
                [PRIMARY_CONSULTANT_FIELD.fieldApiName] : this.userId,
            };

            if (this.sessionSite)   fields[SESSION_SITE_FIELD.fieldApiName]   = this.sessionSite;
            if (this.subProgram)    fields[SUB_PROGRAM_FIELD.fieldApiName]    = this.subProgram;
            if (this.languageOther) fields[LANGUAGE_OTHER_FIELD.fieldApiName] = this.languageOther;
            if (this.accountId)     fields[ACCOUNT_FIELD.fieldApiName]        = this.accountId;
            if (this.caseId)        fields[CASE_FIELD.fieldApiName]           = this.caseId;
            if (this.contactId)     fields[CONTACT_FIELD.fieldApiName]        = this.contactId;
            if (this._context === 'Impact' && this.impactId) {
                fields[IMPACT_FIELD.fieldApiName] = this.impactId;
            }

            const result = await createRecord({ apiName: SESSION_OBJECT.objectApiName, fields });
            this.savedSessionId = result.id;
            this.isSaved  = true;
            this.isSaving = false;

            this.dispatchEvent(new ShowToastEvent({
                title   : 'Session Created',
                message : 'New session saved successfully.',
                variant : 'success'
            }));

        } catch (error) {
            this.isSaving  = false;
            const msg = error?.body?.message || error?.message || 'An unexpected error occurred.';
            this.saveError = `Save failed: ${msg}`;
        }
    }

    handleViewSession() {
        if (this.savedSessionId) {
            this[NavigationMixin.Navigate]({
                type: 'standard__recordPage',
                attributes: { recordId: this.savedSessionId, actionName: 'view' }
            });
        }
    }

    // ─── Utilities ───────────────────────────────────────────────────────────
    _toOptions(values) {
        return (values || []).map(v => ({ label: v.label, value: v.value }));
    }

    _nowLocal() {
        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    }
}

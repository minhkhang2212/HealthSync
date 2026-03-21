import React from 'react';

const BOOKING_FOR_OPTIONS = [
    { value: 'self', label: 'Book for myself' },
    { value: 'family', label: 'Book for a family member' },
];

const GENDER_OPTIONS = [
    { value: 'M', label: 'Male' },
    { value: 'F', label: 'Female' },
    { value: 'O', label: 'Other' },
];

const INPUT_BASE_CLASS =
    'w-full rounded-2xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:ring-4 focus:ring-blue-100';

const getFieldClassName = (hasError) =>
    `${INPUT_BASE_CLASS} ${hasError ? 'border-red-300 focus:border-red-400' : 'border-slate-200 focus:border-primary'}`;

const PAYMENT_OPTIONS = [
    {
        value: 'pay_at_clinic',
        label: 'Pay at clinic',
        description: 'Pay in person when you arrive for the appointment.',
        icon: 'payments',
    },
    {
        value: 'stripe',
        label: 'Pay online',
        description: 'Secure Stripe checkout with card and Apple Pay when available.',
        icon: 'credit_card',
    },
];

const BookingRequestModal = ({
    open,
    onClose,
    onSubmit,
    onChange,
    onSelectPaymentMethod,
    formData,
    fieldErrors,
    submissionError,
    submitting,
    doctorName,
    clinicName,
    consultationFee,
    selectedDateLabel,
    selectedTimeLabel,
    paymentAvailability,
}) => {
    if (!open) return null;

    const submitLabel = formData.paymentMethod === 'stripe' ? 'Continue to Payment' : 'Confirm Booking';

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/55 px-4 py-6 sm:px-6" onClick={onClose}>
            <div className="w-full max-w-[1160px] rounded-[32px] border border-white/30 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
                <div className="sticky top-0 z-10 flex items-start justify-between gap-4 rounded-t-[32px] border-b border-slate-200 bg-white/95 px-6 py-5 backdrop-blur md:px-8">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Booking Details</p>
                        <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">Confirm Your Appointment</h2>
                        <p className="mt-2 text-sm text-slate-500">
                            Complete the patient details and choose how you want to pay.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="grid size-11 shrink-0 place-items-center rounded-2xl border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
                    >
                        <span className="material-symbols-outlined text-[22px]">close</span>
                    </button>
                </div>

                <div className="grid gap-0 lg:grid-cols-[1.55fr_0.95fr]">
                    <div className="space-y-6 px-6 py-6 md:px-8">
                        <section className="rounded-[28px] border border-primary/15 bg-[linear-gradient(135deg,_#eff6ff,_#ffffff_55%,_#f8fafc)] p-5">
                            <div className="grid gap-5 md:grid-cols-2 md:items-start">
                                <div className="min-w-0 rounded-2xl bg-white/70 px-4 py-4">
                                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Doctor</p>
                                    <p className="mt-2 text-[22px] font-black leading-tight text-slate-900">{doctorName}</p>
                                    <p className="mt-2 text-[14px] leading-6 text-slate-500">{clinicName}</p>
                                </div>

                                <div className="min-w-0 rounded-2xl bg-white/70 px-4 py-4">
                                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Appointment Slot</p>
                                    <p className="mt-2 text-[22px] font-black leading-tight text-slate-900">{selectedDateLabel}</p>
                                    <p className="mt-2 text-[14px] leading-6 text-slate-500 whitespace-nowrap">{selectedTimeLabel}</p>
                                </div>
                            </div>
                        </section>

                        <section>
                            <p className="mb-3 text-sm font-black text-slate-900">Who is this appointment for?</p>
                            <div className="flex flex-wrap gap-3">
                                {BOOKING_FOR_OPTIONS.map((option) => {
                                    const isActive = formData.bookingFor === option.value;
                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => onChange('bookingFor', option.value)}
                                            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                                                isActive
                                                    ? 'border-primary bg-blue-50 text-primary'
                                                    : 'border-slate-200 bg-white text-slate-600 hover:border-primary/40 hover:text-slate-900'
                                            }`}
                                        >
                                            <span className={`size-3 rounded-full border ${isActive ? 'border-primary bg-primary' : 'border-slate-300 bg-white'}`} />
                                            {option.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </section>

                        <section className="grid gap-4 md:grid-cols-2">
                            <label className="block">
                                <span className="mb-2 block text-sm font-bold text-slate-700">Patient Full Name</span>
                                <input
                                    type="text"
                                    value={formData.patientName}
                                    onChange={(event) => onChange('patientName', event.target.value)}
                                    placeholder="Enter full name"
                                    className={getFieldClassName(!!fieldErrors.patientName)}
                                />
                                {fieldErrors.patientName && <span className="mt-2 block text-xs font-medium text-red-600">{fieldErrors.patientName}</span>}
                            </label>

                            <div>
                                <span className="mb-2 block text-sm font-bold text-slate-700">Gender</span>
                                <div className="grid grid-cols-3 gap-2">
                                    {GENDER_OPTIONS.map((option) => {
                                        const isActive = formData.patientGender === option.value;
                                        return (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => onChange('patientGender', option.value)}
                                                className={`inline-flex w-full items-center justify-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition ${
                                                    isActive
                                                        ? 'border-primary bg-blue-50 text-primary'
                                                        : 'border-slate-200 bg-white text-slate-600 hover:border-primary/40 hover:text-slate-900'
                                                }`}
                                            >
                                                <span className={`size-3 rounded-full border ${isActive ? 'border-primary bg-primary' : 'border-slate-300 bg-white'}`} />
                                                {option.label}
                                            </button>
                                        );
                                    })}
                                </div>
                                {fieldErrors.patientGender && <span className="mt-2 block text-xs font-medium text-red-600">{fieldErrors.patientGender}</span>}
                            </div>

                            <label className="block">
                                <span className="mb-2 block text-sm font-bold text-slate-700">Phone Number</span>
                                <input
                                    type="tel"
                                    value={formData.patientPhoneNumber}
                                    onChange={(event) => onChange('patientPhoneNumber', event.target.value)}
                                    placeholder="Enter contact phone"
                                    className={getFieldClassName(!!fieldErrors.patientPhoneNumber)}
                                />
                                {fieldErrors.patientPhoneNumber && <span className="mt-2 block text-xs font-medium text-red-600">{fieldErrors.patientPhoneNumber}</span>}
                            </label>

                            <label className="block">
                                <span className="mb-2 block text-sm font-bold text-slate-700">Email Address</span>
                                <input
                                    type="email"
                                    value={formData.patientContactEmail}
                                    onChange={(event) => onChange('patientContactEmail', event.target.value)}
                                    placeholder="patient@example.com"
                                    className={getFieldClassName(!!fieldErrors.patientContactEmail)}
                                />
                                {fieldErrors.patientContactEmail && <span className="mt-2 block text-xs font-medium text-red-600">{fieldErrors.patientContactEmail}</span>}
                            </label>

                            <label className="block">
                                <span className="mb-2 block text-sm font-bold text-slate-700">Birth Year</span>
                                <input
                                    type="number"
                                    value={formData.patientBirthYear}
                                    onChange={(event) => onChange('patientBirthYear', event.target.value)}
                                    placeholder="e.g. 1992"
                                    className={getFieldClassName(!!fieldErrors.patientBirthYear)}
                                />
                                {fieldErrors.patientBirthYear && <span className="mt-2 block text-xs font-medium text-red-600">{fieldErrors.patientBirthYear}</span>}
                            </label>

                            <label className="block">
                                <span className="mb-2 block text-sm font-bold text-slate-700">City / Region</span>
                                <input
                                    type="text"
                                    value={formData.patientProvince}
                                    onChange={(event) => onChange('patientProvince', event.target.value)}
                                    placeholder="Enter city or region"
                                    className={getFieldClassName(!!fieldErrors.patientProvince)}
                                />
                                {fieldErrors.patientProvince && <span className="mt-2 block text-xs font-medium text-red-600">{fieldErrors.patientProvince}</span>}
                            </label>

                            <label className="block">
                                <span className="mb-2 block text-sm font-bold text-slate-700">District / Area</span>
                                <input
                                    type="text"
                                    value={formData.patientDistrict}
                                    onChange={(event) => onChange('patientDistrict', event.target.value)}
                                    placeholder="Enter district or area"
                                    className={getFieldClassName(!!fieldErrors.patientDistrict)}
                                />
                                {fieldErrors.patientDistrict && <span className="mt-2 block text-xs font-medium text-red-600">{fieldErrors.patientDistrict}</span>}
                            </label>

                            <label className="block md:col-span-2">
                                <span className="mb-2 block text-sm font-bold text-slate-700">Street Address</span>
                                <input
                                    type="text"
                                    value={formData.patientAddress}
                                    onChange={(event) => onChange('patientAddress', event.target.value)}
                                    placeholder="Enter address"
                                    className={getFieldClassName(!!fieldErrors.patientAddress)}
                                />
                                {fieldErrors.patientAddress && <span className="mt-2 block text-xs font-medium text-red-600">{fieldErrors.patientAddress}</span>}
                            </label>

                            <label className="block md:col-span-2">
                                <span className="mb-2 block text-sm font-bold text-slate-700">Reason for Visit</span>
                                <textarea
                                    rows={4}
                                    value={formData.reasonForVisit}
                                    onChange={(event) => onChange('reasonForVisit', event.target.value)}
                                    placeholder="Tell the clinic what you need help with"
                                    className={getFieldClassName(!!fieldErrors.reasonForVisit)}
                                />
                                {fieldErrors.reasonForVisit && <span className="mt-2 block text-xs font-medium text-red-600">{fieldErrors.reasonForVisit}</span>}
                            </label>
                        </section>
                    </div>

                    <aside className="border-t border-slate-200 bg-slate-50 px-6 py-6 lg:border-l lg:border-t-0 md:px-8">
                        <div className="space-y-6">
                            <section>
                                <p className="text-sm font-black text-slate-900">Payment Method</p>
                                <div className="mt-3 space-y-3">
                                    {PAYMENT_OPTIONS.map((option) => {
                                        const isAvailable = paymentAvailability[option.value];
                                        const isActive = formData.paymentMethod === option.value;
                                        return (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => isAvailable && onSelectPaymentMethod(option.value)}
                                                disabled={!isAvailable}
                                                className={`w-full rounded-[24px] border px-4 py-4 text-left transition ${
                                                    isActive
                                                        ? 'border-primary bg-white shadow-md shadow-blue-100'
                                                        : 'border-slate-200 bg-white'
                                                } ${!isAvailable ? 'cursor-not-allowed opacity-45' : 'hover:border-primary/40 hover:shadow-sm'}`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className={`grid size-11 shrink-0 place-items-center rounded-2xl ${isActive ? 'bg-blue-50 text-primary' : 'bg-slate-100 text-slate-500'}`}>
                                                        <span className="material-symbols-outlined">{option.icon}</span>
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-black text-slate-900">{option.label}</p>
                                                            {isActive && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-black text-primary">Selected</span>}
                                                        </div>
                                                        <p className="mt-1 text-sm leading-6 text-slate-500">
                                                            {isAvailable ? option.description : 'This payment option is not available for the selected clinic.'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                                {fieldErrors.paymentMethod && <span className="mt-2 block text-xs font-medium text-red-600">{fieldErrors.paymentMethod}</span>}
                            </section>

                            <section className="rounded-[28px] border border-slate-200 bg-white p-5">
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Payment Summary</p>
                                <div className="mt-4 space-y-3 text-sm text-slate-600">
                                    <div className="flex items-center justify-between gap-4">
                                        <span>Consultation Fee</span>
                                        <span className="font-bold text-slate-900">{consultationFee}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                        <span>Booking Fee</span>
                                        <span className="font-bold text-emerald-700">Free</span>
                                    </div>
                                    <div className="border-t border-slate-100 pt-3">
                                        <div className="flex items-center justify-between gap-4">
                                            <span className="font-bold text-slate-900">Total</span>
                                            <span className="text-xl font-black text-primary">{consultationFee}</span>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <div className="rounded-[28px] border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600">
                                <p className="font-black text-slate-900">What happens next?</p>
                                <p className="mt-2">
                                    Choose <span className="font-semibold text-slate-900">Pay at clinic</span> to finish immediately, or{' '}
                                    <span className="font-semibold text-slate-900">Pay online</span> to continue to a secure Stripe checkout page.
                                </p>
                            </div>

                            {submissionError && (
                                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                    {submissionError}
                                </div>
                            )}

                            <div className="space-y-3">
                                <button
                                    type="button"
                                    onClick={onSubmit}
                                    disabled={submitting}
                                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-4 text-base font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {submitting ? 'Processing...' : submitLabel}
                                    <span className="material-symbols-outlined text-[20px]">{formData.paymentMethod === 'stripe' ? 'lock' : 'calendar_month'}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
};

export default BookingRequestModal;

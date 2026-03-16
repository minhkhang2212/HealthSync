import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    cancelDoctorBooking,
    clearScheduleError,
    confirmDoctorBooking,
    fetchDoctorBookings,
    markDoctorBookingNoShow,
    sendDoctorPrescription,
} from '../store/slices/scheduleSlice';
import apiClient, { getApiAssetBase } from '../utils/apiClient';
import { readAllcodeCache, writeAllcodeCache } from '../utils/allcodeCache';
import { DEFAULT_TIME_LABELS } from '../utils/timeSlots';
import DoctorShell from '../components/layout/DoctorShell';

const formatLondonDate = (date) => {
    const parts = new Intl.DateTimeFormat('en', {
        timeZone: 'Europe/London',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(date);

    const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${lookup.year}-${lookup.month}-${lookup.day}`;
};

const formatReadableDate = (date) => {
    const parsed = new Date(`${date}T00:00:00`);
    return Number.isNaN(parsed.getTime())
        ? date
        : parsed.toLocaleDateString('en-GB', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
};

const resolveAttachmentUrl = (value, apiAssetBase) => {
    if (!value || typeof value !== 'string') return '';
    const trimmed = value.trim().replace(/\\/g, '/');
    if (!trimmed) return '';
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) return trimmed;
    if (trimmed.startsWith('/')) return apiAssetBase ? `${apiAssetBase}${trimmed}` : trimmed;
    if (trimmed.startsWith('storage/')) return apiAssetBase ? `${apiAssetBase}/${trimmed}` : `/${trimmed}`;
    return trimmed;
};

const getRecipientEmail = (booking) => booking.patientContactEmail || booking.patient?.email || 'the patient email on file';

const getStatusPresentation = (booking) => {
    if (booking.statusId === 'S2') {
        return { text: 'Cancelled', className: 'bg-red-100 text-red-700' };
    }
    if (booking.statusId === 'S3') {
        return { text: 'Done', className: 'bg-emerald-100 text-emerald-700' };
    }
    if (booking.statusId === 'S4') {
        return { text: 'No-show', className: 'bg-amber-100 text-amber-700' };
    }
    if (booking.confirmedAt) {
        return { text: 'Confirmed', className: 'bg-blue-100 text-blue-700' };
    }
    return { text: 'New', className: 'bg-slate-100 text-slate-700' };
};

const EmailActionModal = ({
    mode,
    booking,
    attachmentFile,
    errorMessage,
    onAttachmentChange,
    onClose,
    onSubmit,
    submitting,
}) => {
    if (!booking) return null;

    const isPrescriptionMode = mode === 'prescription';
    const recipientEmail = getRecipientEmail(booking);
    const title = isPrescriptionMode ? 'Send Prescription' : 'Confirm Appointment';
    const intro = isPrescriptionMode
        ? 'Prescription and thank-you email will be sent to'
        : 'Confirmation will be sent to';
    const fileLabel = isPrescriptionMode ? 'Prescription File' : 'Confirmation Attachment';
    const emptyLabel = isPrescriptionMode
        ? 'Upload the prescription file to send after the visit'
        : 'Upload one file to include with the confirmation';
    const buttonLabel = isPrescriptionMode ? 'Send Prescription Email' : 'Send Confirmation';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900">{title}</h2>
                        <p className="mt-2 text-sm text-slate-500">
                            {intro} <span className="font-bold text-slate-700">{recipientEmail}</span>.
                        </p>
                    </div>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700">
                        <span className="material-symbols-outlined text-2xl">close</span>
                    </button>
                </div>

                <div className="mt-6 space-y-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                        <p><span className="font-semibold text-slate-900">Patient:</span> {booking.patient?.name || `Patient #${booking.patientId}`}</p>
                        <p><span className="font-semibold text-slate-900">Contact Email:</span> {recipientEmail}</p>
                        <p><span className="font-semibold text-slate-900">Date:</span> {formatReadableDate(booking.date)}</p>
                        <p><span className="font-semibold text-slate-900">Slot:</span> {booking.timeLabel || booking.timeType}</p>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-bold text-slate-700">{fileLabel}</label>
                        <label className="flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600 hover:border-primary hover:bg-blue-50">
                            <span>{attachmentFile ? attachmentFile.name : emptyLabel}</span>
                            <span className="rounded-lg bg-white px-3 py-1 text-xs font-bold text-primary">Choose File</span>
                            <input type="file" className="hidden" onChange={onAttachmentChange} />
                        </label>
                        {isPrescriptionMode && (
                            <p className="mt-2 text-xs text-slate-500">Prescription file is required before this booking can be marked as done.</p>
                        )}
                    </div>

                    {errorMessage && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {errorMessage}
                        </div>
                    )}
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700">
                        Close
                    </button>
                    <button
                        type="button"
                        onClick={onSubmit}
                        disabled={submitting}
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                    >
                        {submitting ? 'Sending...' : buttonLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

const DoctorAppointments = () => {
    const dispatch = useDispatch();
    const { bookings, loadingBookings, error } = useSelector((state) => state.schedule);
    const [actionLoading, setActionLoading] = React.useState(null);
    const [search, setSearch] = React.useState('');
    const [selectedDate, setSelectedDate] = React.useState(() => formatLondonDate(new Date()));
    const [timeLabels, setTimeLabels] = React.useState(DEFAULT_TIME_LABELS);
    const [notice, setNotice] = React.useState('');
    const [emailModal, setEmailModal] = React.useState(null);
    const [emailAttachmentFile, setEmailAttachmentFile] = React.useState(null);
    const [modalError, setModalError] = React.useState('');

    const apiAssetBase = React.useMemo(() => getApiAssetBase(), []);

    React.useEffect(() => {
        dispatch(fetchDoctorBookings({ date: selectedDate || undefined }));
    }, [dispatch, selectedDate]);

    React.useEffect(() => {
        if (!notice) return undefined;
        const timer = setTimeout(() => setNotice(''), 4000);
        return () => clearTimeout(timer);
    }, [notice]);

    React.useEffect(() => {
        const loadTimeLabels = async () => {
            try {
                const cached = readAllcodeCache('TIME');
                const response = cached
                    ? { data: cached }
                    : await apiClient.get('/allcodes', { params: { type: 'TIME' } });
                if (!cached && Array.isArray(response.data)) {
                    writeAllcodeCache('TIME', response.data);
                }

                const labels = { ...DEFAULT_TIME_LABELS };
                for (const code of response.data || []) {
                    if (code?.key) {
                        labels[code.key] = code.valueEn || code.key;
                    }
                }
                setTimeLabels(labels);
            } catch {
                setTimeLabels(DEFAULT_TIME_LABELS);
            }
        };

        loadTimeLabels();
    }, []);

    const filteredBookings = React.useMemo(() => {
        const query = search.trim().toLowerCase();
        return bookings
            .map((booking) => ({
                ...booking,
                timeLabel: timeLabels[booking.timeType] || booking.timeType,
            }))
            .filter((booking) => {
                if (!query) return true;

                const haystack = [
                    booking.id,
                    booking.patient?.name,
                    booking.patient?.email,
                    booking.patientContactEmail,
                    booking.patientId,
                    booking.date,
                    booking.timeType,
                    booking.timeLabel,
                    booking.statusId,
                ].join(' ').toLowerCase();

                return haystack.includes(query);
            })
            .sort((left, right) => {
                if (left.date !== right.date) {
                    return String(left.date).localeCompare(String(right.date));
                }

                const leftOrder = Number.parseInt(String(left.timeType || '').replace(/\D/g, ''), 10) || 999;
                const rightOrder = Number.parseInt(String(right.timeType || '').replace(/\D/g, ''), 10) || 999;
                return leftOrder - rightOrder;
            });
    }, [bookings, search, timeLabels]);

    const openConfirmModal = (booking) => {
        setEmailModal({
            mode: 'confirm',
            ...booking,
            timeLabel: timeLabels[booking.timeType] || booking.timeType,
        });
        setEmailAttachmentFile(null);
        setModalError('');
    };

    const openPrescriptionModal = (booking) => {
        setEmailModal({
            mode: 'prescription',
            ...booking,
            timeLabel: timeLabels[booking.timeType] || booking.timeType,
        });
        setEmailAttachmentFile(null);
        setModalError('');
    };

    const closeEmailModal = () => {
        setEmailModal(null);
        setEmailAttachmentFile(null);
        setModalError('');
    };

    const executeAction = async (type, booking) => {
        setActionLoading(`${type}-${booking.id}`);

        let result;
        if (type === 'cancel') {
            result = await dispatch(cancelDoctorBooking(booking.id));
            if (cancelDoctorBooking.fulfilled.match(result)) {
                setNotice(`Appointment for ${booking.patient?.name || `Patient #${booking.patientId}`} has been cancelled.`);
            }
        }

        if (type === 'noshow') {
            result = await dispatch(markDoctorBookingNoShow(booking.id));
            if (markDoctorBookingNoShow.fulfilled.match(result)) {
                setNotice(`${booking.patient?.name || `Patient #${booking.patientId}`} was marked as no-show.`);
            }
        }

        setActionLoading(null);
    };

    const submitEmailAction = async () => {
        if (!emailModal) return;

        if (emailModal.mode === 'prescription' && !(emailAttachmentFile instanceof File)) {
            setModalError('Please upload the prescription file before sending.');
            return;
        }

        setModalError('');
        setActionLoading(`${emailModal.mode}-${emailModal.id}`);

        const result = emailModal.mode === 'confirm'
            ? await dispatch(confirmDoctorBooking({
                id: emailModal.id,
                attachmentFile: emailAttachmentFile,
            }))
            : await dispatch(sendDoctorPrescription({
                id: emailModal.id,
                attachmentFile: emailAttachmentFile,
            }));

        setActionLoading(null);

        if (confirmDoctorBooking.fulfilled.match(result) || sendDoctorPrescription.fulfilled.match(result)) {
            const recipient = getRecipientEmail(emailModal);
            setNotice(
                emailModal.mode === 'confirm'
                    ? `Confirmation email sent to ${recipient}.`
                    : `Prescription email sent to ${recipient}. Booking marked as done.`
            );
            closeEmailModal();
        }
    };

    return (
        <DoctorShell
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search appointments by patient, email, date, slot..."
            showSearch
        >
            <section className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-black tracking-tight">My Appointments</h1>
                    <p className="text-sm text-slate-500">Review patients, confirm appointments, and complete prescriptions.</p>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                    <div>
                        <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Filter by date</label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(event) => setSelectedDate(event.target.value)}
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => setSelectedDate('')}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700"
                    >
                        Clear Filter
                    </button>
                </div>
            </section>

            {notice && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {notice}
                </div>
            )}

            {error && (
                <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <span>{error}</span>
                    <button type="button" onClick={() => dispatch(clearScheduleError())} className="font-black">x</button>
                </div>
            )}

            <section className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-500">{filteredBookings.length} appointment(s)</p>
                </div>

                {loadingBookings ? (
                    <p className="text-slate-500">Loading appointments...</p>
                ) : filteredBookings.length === 0 ? (
                    <p className="text-slate-500">No appointments found for the current filters.</p>
                ) : (
                    <div className="space-y-4">
                        {filteredBookings.map((booking) => {
                            const status = getStatusPresentation(booking);
                            const canConfirm = booking.statusId === 'S1' && !booking.confirmedAt;
                            const canCancel = canConfirm;
                            const canSendPrescription = booking.statusId === 'S1' && !!booking.confirmedAt;
                            const canMarkNoShow = booking.statusId === 'S1' && !!booking.confirmedAt;
                            const recipientEmail = getRecipientEmail(booking);
                            const confirmationAttachmentUrl = resolveAttachmentUrl(booking.confirmationAttachment, apiAssetBase);
                            const prescriptionAttachmentUrl = resolveAttachmentUrl(booking.prescriptionAttachment, apiAssetBase);

                            return (
                                <article key={booking.id} className="rounded-xl border border-slate-200 p-5">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <h2 className="text-xl font-black text-slate-900">{booking.patient?.name || `Patient #${booking.patientId}`}</h2>
                                            <p className="mt-1 text-sm text-slate-500">{recipientEmail}</p>
                                            <p className="mt-3 text-sm text-slate-600">
                                                Date: {formatReadableDate(booking.date)} | Time: {booking.timeLabel}
                                            </p>
                                        </div>
                                        <span className={`rounded-full px-3 py-1 text-xs font-black ${status.className}`}>{status.text}</span>
                                    </div>

                                    {booking.confirmedAt && booking.statusId === 'S1' && (
                                        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                                            <p className="font-semibold">Confirmation sent</p>
                                            <p className="mt-1">
                                                Appointment confirmation was sent to {recipientEmail} on{' '}
                                                {new Date(booking.confirmedAt).toLocaleString('en-GB')}.
                                            </p>
                                            {confirmationAttachmentUrl && (
                                                <a
                                                    href={confirmationAttachmentUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="mt-2 inline-flex items-center gap-1 font-bold text-primary hover:underline"
                                                >
                                                    <span className="material-symbols-outlined text-base">attach_file</span>
                                                    View Attachment
                                                </a>
                                            )}
                                        </div>
                                    )}

                                    {booking.statusId === 'S3' && booking.prescriptionSentAt && (
                                        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                                            <p className="font-semibold">Prescription sent</p>
                                            <p className="mt-1">
                                                Prescription email was sent to {recipientEmail} on{' '}
                                                {new Date(booking.prescriptionSentAt).toLocaleString('en-GB')}.
                                            </p>
                                            {prescriptionAttachmentUrl && (
                                                <a
                                                    href={prescriptionAttachmentUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="mt-2 inline-flex items-center gap-1 font-bold text-primary hover:underline"
                                                >
                                                    <span className="material-symbols-outlined text-base">attach_file</span>
                                                    View Prescription File
                                                </a>
                                            )}
                                        </div>
                                    )}

                                    <div className="mt-5 flex flex-wrap gap-2">
                                        {canConfirm && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => openConfirmModal(booking)}
                                                    className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white"
                                                >
                                                    Confirm
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => executeAction('cancel', booking)}
                                                    disabled={actionLoading === `cancel-${booking.id}`}
                                                    className="rounded-lg bg-red-100 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-60"
                                                >
                                                    {actionLoading === `cancel-${booking.id}` ? 'Cancelling...' : 'Cancel'}
                                                </button>
                                            </>
                                        )}

                                        {canSendPrescription && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => openPrescriptionModal(booking)}
                                                    className="rounded-lg bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-700"
                                                >
                                                    Send Prescription
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => executeAction('noshow', booking)}
                                                    disabled={actionLoading === `noshow-${booking.id}`}
                                                    className="rounded-lg bg-amber-100 px-3 py-2 text-xs font-bold text-amber-700 disabled:opacity-60"
                                                >
                                                    {actionLoading === `noshow-${booking.id}` ? 'Saving...' : 'No-show'}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>

            <EmailActionModal
                mode={emailModal?.mode}
                booking={emailModal}
                attachmentFile={emailAttachmentFile}
                errorMessage={modalError}
                onAttachmentChange={(event) => {
                    setEmailAttachmentFile(event.target.files?.[0] || null);
                    setModalError('');
                }}
                onClose={closeEmailModal}
                onSubmit={submitEmailAction}
                submitting={!!emailModal && actionLoading === `${emailModal.mode}-${emailModal.id}`}
            />
        </DoctorShell>
    );
};

export default DoctorAppointments;

import { DEFAULT_TIME_LABELS } from './timeSlots';

export const DEFAULT_ADMIN_BOOKING_STATUS_LABELS = {
    S1: 'New',
    S2: 'Cancelled',
    S3: 'Done',
    S4: 'No-show',
};

const normalizeSearchText = (value) =>
    String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

const stringifySearchValue = (value) => {
    if (typeof value === 'string') {
        return value;
    }

    if (Array.isArray(value)) {
        return value.map((item) => stringifySearchValue(item)).join(' ');
    }

    if (value && typeof value === 'object') {
        return Object.values(value)
            .map((item) => stringifySearchValue(item))
            .join(' ');
    }

    return value == null ? '' : String(value);
};

const parseTimestamp = (value) => {
    if (value instanceof Date) {
        return value.getTime();
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value !== 'string' || !value.trim()) {
        return Number.NaN;
    }

    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? Number.NaN : parsed;
};

const resolveCreatedTimestamp = (item) => {
    const candidates = [
        item?.createdAt,
        item?.created_at,
        item?.raw?.createdAt,
        item?.raw?.created_at,
    ];

    for (const candidate of candidates) {
        const timestamp = parseTimestamp(candidate);
        if (!Number.isNaN(timestamp)) {
            return timestamp;
        }
    }

    return Number.NaN;
};

const resolveNumericId = (item) => {
    const candidates = [item?.id, item?.raw?.id];

    for (const candidate of candidates) {
        const numeric = Number(candidate);
        if (Number.isFinite(numeric)) {
            return numeric;
        }
    }

    return 0;
};

const formatDisplayDate = (value, options) => {
    const parsed = new Date(String(value || '').length <= 10 ? `${value}T00:00:00` : value);
    if (Number.isNaN(parsed.getTime())) {
        return '--';
    }

    return parsed.toLocaleDateString('en-GB', options);
};

export const formatPaymentMethodLabel = (value) => {
    switch (value) {
        case 'stripe':
            return 'Online payment';
        case 'pay_at_clinic':
            return 'Pay at clinic';
        default:
            return value ? String(value).replace(/_/g, ' ') : 'Unknown';
    }
};

export const sortByNewestCreated = (items) =>
    [...items].sort((left, right) => {
        const leftCreated = resolveCreatedTimestamp(left);
        const rightCreated = resolveCreatedTimestamp(right);
        const hasLeftCreated = !Number.isNaN(leftCreated);
        const hasRightCreated = !Number.isNaN(rightCreated);

        if (hasLeftCreated && hasRightCreated) {
            const createdDiff = rightCreated - leftCreated;
            if (createdDiff !== 0) {
                return createdDiff;
            }
        } else if (hasRightCreated) {
            return 1;
        } else if (hasLeftCreated) {
            return -1;
        }

        return resolveNumericId(right) - resolveNumericId(left);
    });

export const buildDoctorAdminRows = (doctors, clinicNames, specialtyNames) =>
    doctors.map((doctor) => {
        const doctorInfor = doctor.doctor_infor || doctor.doctorInfor;
        const relations = doctor.doctor_clinic_specialties || doctor.doctorClinicSpecialties || [];
        const relation = relations[0];
        const clinicId = relation?.clinicId ?? relation?.clinic_id ?? null;
        const specialtyId = relation?.specialtyId ?? relation?.specialty_id ?? null;
        const isActive = doctor.isActive !== false;
        const hasProfile = Boolean(doctorInfor);

        let statusText = 'Pending Setup';
        let statusClass = 'text-amber-700 bg-amber-100';
        if (!isActive) {
            statusText = 'Inactive';
            statusClass = 'text-rose-700 bg-rose-100';
        } else if (hasProfile) {
            statusText = 'Active';
            statusClass = 'text-emerald-700 bg-emerald-100';
        }

        return {
            id: doctor.id,
            name: doctor.name || 'Unknown',
            email: doctor.email || 'No email',
            clinicId: clinicId == null ? '' : String(clinicId),
            specialtyId: specialtyId == null ? '' : String(specialtyId),
            clinic:
                relation?.clinic?.name ||
                clinicNames[String(clinicId)] ||
                doctorInfor?.nameClinic ||
                doctorInfor?.name_clinic ||
                'Not assigned',
            specialty:
                relation?.specialty?.name ||
                specialtyNames[String(specialtyId)] ||
                'General',
            isActive,
            statusValue: isActive ? 'active' : 'inactive',
            statusText,
            statusClass,
            createdAt: doctor.createdAt || doctor.created_at || null,
            searchText: normalizeSearchText(
                `${doctor.name || ''} ${doctor.email || ''} ${
                    relation?.clinic?.name || clinicNames[String(clinicId)] || doctorInfor?.nameClinic || doctorInfor?.name_clinic || ''
                } ${relation?.specialty?.name || specialtyNames[String(specialtyId)] || ''}`
            ),
            raw: doctor,
        };
    });

export const filterDoctorAdminRows = (
    rows,
    {
        search = '',
        clinicId = 'all',
        specialtyId = 'all',
        status = 'all',
    } = {}
) => {
    const searchKey = normalizeSearchText(search);

    return rows.filter((row) => {
        if (clinicId !== 'all' && String(row.clinicId || '') !== String(clinicId)) {
            return false;
        }

        if (specialtyId !== 'all' && String(row.specialtyId || '') !== String(specialtyId)) {
            return false;
        }

        if (status !== 'all' && row.statusValue !== status) {
            return false;
        }

        if (searchKey && !row.searchText.includes(searchKey)) {
            return false;
        }

        return true;
    });
};

export const getBookingStatusMeta = (booking, statusLabels = DEFAULT_ADMIN_BOOKING_STATUS_LABELS) => {
    if (booking.statusId === 'S2') {
        return {
            value: 'cancelled',
            label: statusLabels.S2 || 'Cancelled',
            chipClass: 'text-red-700 bg-red-100',
            dateClass: 'bg-red-100 text-red-600',
        };
    }

    if (booking.statusId === 'S3') {
        return {
            value: 'done',
            label: statusLabels.S3 || 'Done',
            chipClass: 'text-emerald-700 bg-emerald-100',
            dateClass: 'bg-emerald-100 text-emerald-700',
        };
    }

    if (booking.statusId === 'S4') {
        return {
            value: 'no-show',
            label: statusLabels.S4 || 'No-show',
            chipClass: 'text-amber-700 bg-amber-100',
            dateClass: 'bg-amber-100 text-amber-700',
        };
    }

    if (booking.confirmedAt || booking.confirmed_at) {
        return {
            value: 'confirmed',
            label: 'Confirmed',
            chipClass: 'text-blue-700 bg-blue-100',
            dateClass: 'bg-blue-100 text-primary',
        };
    }

    return {
        value: 'new',
        label: statusLabels.S1 || 'New',
        chipClass: 'text-slate-700 bg-slate-100',
        dateClass: 'bg-slate-200 text-slate-600',
    };
};

export const buildAdminBookingRows = (
    bookings,
    {
        doctorSpecialtyById = {},
        statusLabels = DEFAULT_ADMIN_BOOKING_STATUS_LABELS,
        timeLabels = DEFAULT_TIME_LABELS,
    } = {}
) =>
    bookings.map((booking) => {
        const statusMeta = getBookingStatusMeta(booking, statusLabels);
        const patientName = booking.patient?.name || `Patient #${booking.patientId || '--'}`;
        const patientEmail = booking.patientContactEmail || booking.patient?.email || 'No email';
        const doctorName = booking.doctor?.name || `Doctor #${booking.doctorId || '--'}`;
        const doctorEmail = booking.doctor?.email || '';
        const specialtyName = doctorSpecialtyById[String(booking.doctorId)] || 'General';
        const paymentMethod = booking.paymentMethod || '';
        const paymentMethodLabel = formatPaymentMethodLabel(paymentMethod);
        const bookingDetailsText = stringifySearchValue(booking.bookingDetails);

        return {
            id: booking.id,
            patientName,
            patientEmail,
            doctorId: booking.doctorId == null ? '' : String(booking.doctorId),
            doctorName,
            doctorEmail,
            specialtyName,
            appointmentDate: booking.date || '',
            appointmentDateLabel: formatDisplayDate(booking.date, {
                weekday: 'short',
                day: '2-digit',
                month: 'short',
                year: 'numeric',
            }),
            createdAt: booking.createdAt || booking.created_at || null,
            createdDateLabel: booking.createdAt || booking.created_at
                ? formatDisplayDate(booking.createdAt || booking.created_at, {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                })
                : '--',
            timeType: booking.timeType || '',
            timeLabel: timeLabels[booking.timeType] || booking.timeType || '--',
            statusId: booking.statusId || '',
            statusValue: statusMeta.value,
            statusLabel: statusMeta.label,
            statusChipClass: statusMeta.chipClass,
            statusDateClass: statusMeta.dateClass,
            paymentMethod,
            paymentMethodLabel,
            paymentStatus: booking.paymentStatus || '',
            paymentAmount: booking.paymentAmount ?? null,
            paymentCurrency: booking.paymentCurrency || 'gbp',
            bookingDetailsText,
            searchText: normalizeSearchText(
                `${booking.id || ''} ${patientName} ${patientEmail} ${doctorName} ${doctorEmail} ${specialtyName} ${paymentMethodLabel} ${booking.timeType || ''} ${bookingDetailsText}`
            ),
            raw: booking,
        };
    });

export const filterAdminBookingRows = (
    rows,
    {
        search = '',
        status = 'all',
        paymentMethod = 'all',
        doctorId = 'all',
        dateFrom = '',
        dateTo = '',
    } = {}
) => {
    const searchKey = normalizeSearchText(search);

    return rows.filter((row) => {
        if (status !== 'all' && row.statusValue !== status) {
            return false;
        }

        if (paymentMethod !== 'all' && row.paymentMethod !== paymentMethod) {
            return false;
        }

        if (doctorId !== 'all' && String(row.doctorId || '') !== String(doctorId)) {
            return false;
        }

        if (dateFrom && (!row.appointmentDate || row.appointmentDate < dateFrom)) {
            return false;
        }

        if (dateTo && (!row.appointmentDate || row.appointmentDate > dateTo)) {
            return false;
        }

        if (searchKey && !row.searchText.includes(searchKey)) {
            return false;
        }

        return true;
    });
};

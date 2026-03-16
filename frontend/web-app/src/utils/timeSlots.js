const SLOT_START_HOUR = 8;
const SLOT_END_HOUR = 16;
const SLOT_INTERVAL_MINUTES = 30;

const to12HourLabel = (hour, minute) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const normalizedHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${normalizedHour}:${String(minute).padStart(2, '0')} ${period}`;
};

const createSlots = () => {
    const slots = [];
    let index = 1;

    for (let hour = SLOT_START_HOUR; hour < SLOT_END_HOUR; hour += 1) {
        for (const minute of [0, 30]) {
            const startHour = hour;
            const startMinute = minute;
            const totalMinutes = startHour * 60 + startMinute + SLOT_INTERVAL_MINUTES;
            const endHour = Math.floor(totalMinutes / 60);
            const endMinute = totalMinutes % 60;

            slots.push({
                key: `T${index}`,
                valueEn: `${to12HourLabel(startHour, startMinute)} - ${to12HourLabel(endHour, endMinute)}`,
            });
            index += 1;
        }
    }

    return slots;
};

export const TIME_SLOT_DEFINITIONS = createSlots();
export const TIME_CODES = TIME_SLOT_DEFINITIONS.map((slot) => slot.key);
export const DEFAULT_TIME_LABELS = Object.fromEntries(
    TIME_SLOT_DEFINITIONS.map((slot) => [slot.key, slot.valueEn])
);

export const getTimeTypeOrder = (timeType) => {
    const numeric = Number.parseInt(String(timeType || '').replace(/\D/g, ''), 10);
    return Number.isNaN(numeric) ? Number.MAX_SAFE_INTEGER : numeric;
};

export const compareTimeType = (left, right) => getTimeTypeOrder(left) - getTimeTypeOrder(right);

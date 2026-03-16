<?php

namespace App\Helpers;

use Carbon\Carbon;

class TimeHelper
{
    private const TIMEZONE = 'Europe/London';
    private const SLOT_START_HOUR = 8;
    private const SLOT_END_HOUR = 16;
    private const SLOT_INTERVAL_MINUTES = 30;
    private const BOOKING_WINDOW_DAYS_AHEAD = 30;

    private static ?array $slotHoursCache = null;

    /**
     * Get current time in London timezone
     */
    public static function nowLondon(): Carbon
    {
        return Carbon::now(self::TIMEZONE);
    }

    /**
     * Parse a date string into London timezone
     */
    public static function parseLondon(string $date): Carbon
    {
        return Carbon::parse($date, self::TIMEZONE);
    }

    public static function timeSlotHours(): array
    {
        if (self::$slotHoursCache !== null) {
            return self::$slotHoursCache;
        }

        $slots = [];
        $index = 1;
        $cursor = Carbon::createFromTime(self::SLOT_START_HOUR, 0, 0, self::TIMEZONE);
        $end = Carbon::createFromTime(self::SLOT_END_HOUR, 0, 0, self::TIMEZONE);

        while ($cursor->lessThan($end)) {
            $slots["T{$index}"] = $cursor->format('H:i');
            $cursor->addMinutes(self::SLOT_INTERVAL_MINUTES);
            $index++;
        }

        self::$slotHoursCache = $slots;
        return $slots;
    }

    public static function timeTypeKeys(): array
    {
        return array_keys(self::timeSlotHours());
    }

    public static function timeSlotAllcodeRecords(): array
    {
        $records = [];
        $index = 1;
        $cursor = Carbon::createFromTime(self::SLOT_START_HOUR, 0, 0, self::TIMEZONE);
        $end = Carbon::createFromTime(self::SLOT_END_HOUR, 0, 0, self::TIMEZONE);

        while ($cursor->lessThan($end)) {
            $next = $cursor->copy()->addMinutes(self::SLOT_INTERVAL_MINUTES);
            $records[] = [
                'type' => 'TIME',
                'key' => "T{$index}",
                'valueEn' => "{$cursor->format('g:i A')} - {$next->format('g:i A')}",
            ];
            $cursor = $next;
            $index++;
        }

        return $records;
    }

    public static function timeLabelFor(string $timeType): string
    {
        foreach (self::timeSlotAllcodeRecords() as $record) {
            if (($record['key'] ?? null) === $timeType) {
                return $record['valueEn'] ?? $timeType;
            }
        }

        return $timeType;
    }

    public static function bookingWindowStart(): Carbon
    {
        return self::nowLondon()->startOfDay();
    }

    public static function bookingWindowEnd(): Carbon
    {
        return self::nowLondon()->addDays(self::BOOKING_WINDOW_DAYS_AHEAD)->endOfDay();
    }

    public static function bookingDateStrings(): array
    {
        $dates = [];
        $cursor = self::bookingWindowStart();
        $end = self::bookingWindowEnd()->startOfDay();

        while ($cursor->lessThanOrEqualTo($end)) {
            $dates[] = $cursor->toDateString();
            $cursor->addDay();
        }

        return $dates;
    }

    public static function isDateWithinBookingWindow(string $bookingDate): bool
    {
        $date = self::parseLondon($bookingDate)->startOfDay();
        return $date->between(self::bookingWindowStart(), self::bookingWindowEnd()->startOfDay(), true);
    }

    public static function isBookingWindowValid(string $bookingDate, string $timeType): bool
    {
        if (!array_key_exists($timeType, self::timeSlotHours())) {
            return false;
        }

        $now = self::nowLondon();
        $today = self::bookingWindowStart();
        $maxDay = self::bookingWindowEnd();
        $appointmentAt = self::getAppointmentDateTime($bookingDate, $timeType);

        if ($appointmentAt->lessThan($now)) {
            return false;
        }

        return $appointmentAt->between($today, $maxDay, true);
    }

    public static function isDoctorCancellationAllowed(string $bookingDate, string $timeType): bool
    {
        if (!array_key_exists($timeType, self::timeSlotHours())) {
            return false;
        }

        $appointmentAt = self::getAppointmentDateTime($bookingDate, $timeType);
        $hoursToAppointment = self::nowLondon()->diffInHours($appointmentAt, false);

        return $hoursToAppointment >= 24;
    }

    public static function getAppointmentDateTime(string $bookingDate, string $timeType): Carbon
    {
        $slots = self::timeSlotHours();
        $slotStart = $slots[$timeType] ?? null;
        if ($slotStart === null) {
            throw new \InvalidArgumentException("Invalid timeType: {$timeType}");
        }

        return Carbon::createFromFormat(
            'Y-m-d H:i',
            "{$bookingDate} {$slotStart}",
            self::TIMEZONE
        );
    }
}

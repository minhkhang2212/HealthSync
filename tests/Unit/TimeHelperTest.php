<?php

namespace Tests\Unit;

use App\Helpers\TimeHelper;
use PHPUnit\Framework\TestCase;

class TimeHelperTest extends TestCase
{
    public function test_time_slots_define_sixteen_half_hour_slots(): void
    {
        $keys = TimeHelper::timeTypeKeys();
        $hours = TimeHelper::timeSlotHours();

        $this->assertCount(16, $keys);
        $this->assertSame('T1', $keys[0]);
        $this->assertSame('T16', $keys[15]);
        $this->assertSame('08:00', $hours['T1']);
        $this->assertSame('15:30', $hours['T16']);
    }

    public function test_booking_window_covers_today_through_thirty_days_ahead(): void
    {
        $dates = TimeHelper::bookingDateStrings();
        $now = TimeHelper::nowLondon();
        $today = $now->toDateString();
        $thirtyDaysAhead = $now->copy()->addDays(30)->toDateString();

        $this->assertCount(31, $dates);
        $this->assertSame($today, $dates[0]);
        $this->assertSame($thirtyDaysAhead, $dates[30]);
    }
}

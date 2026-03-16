<?php

namespace App\Repositories;

use App\Models\Schedule;
use Illuminate\Database\Eloquent\Collection;

class ScheduleRepository
{
    public function findById(int $id): ?Schedule
    {
        return Schedule::find($id);
    }

    public function create(array $data): Schedule
    {
        return Schedule::create($data);
    }

    public function update(int $id, array $data): bool
    {
        $schedule = $this->findById($id);
        if ($schedule) {
            return $schedule->update($data);
        }
        return false;
    }

    public function getByDoctorAndDate(int $doctorId, string $date): Collection
    {
        return Schedule::query()
            ->where('doctorId', $doctorId)
            ->whereDate('date', $date)
            ->get();
    }

    public function getByDoctorAndDateRange(int $doctorId, string $startDate, string $endDate): Collection
    {
        return Schedule::query()
            ->where('doctorId', $doctorId)
            ->whereDate('date', '>=', $startDate)
            ->whereDate('date', '<=', $endDate)
            ->get();
    }

    public function findByDoctorAndSlot(int $doctorId, string $date, string $timeType): ?Schedule
    {
        return Schedule::query()
            ->where('doctorId', $doctorId)
            ->whereDate('date', $date)
            ->where('timeType', $timeType)
            ->first();
    }

    public function findByDoctorAndSlotForUpdate(int $doctorId, string $date, string $timeType): ?Schedule
    {
        return Schedule::query()
            ->where('doctorId', $doctorId)
            ->whereDate('date', $date)
            ->where('timeType', $timeType)
            ->lockForUpdate()
            ->first();
    }

}

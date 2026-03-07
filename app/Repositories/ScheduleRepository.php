<?php

namespace App\Repositories;

use App\Models\Schedule;
use Illuminate\Database\Eloquent\Collection;

class ScheduleRepository
{
    public function getAll(): Collection
    {
        return Schedule::all();
    }

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

    public function delete(int $id): bool
    {
        $schedule = $this->findById($id);
        if ($schedule) {
            return (bool) $schedule->delete();
        }
        return false;
    }

    public function getByDoctorId(int $doctorId): Collection
    {
        return Schedule::where('doctorId', $doctorId)->get();
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

    // Add locking method for transactions to prevent overbooking
    public function findByIdForUpdate(int $id): ?Schedule
    {
        return Schedule::lockForUpdate()->find($id);
    }
}

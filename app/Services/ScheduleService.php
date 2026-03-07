<?php

namespace App\Services;

use App\DTO\ScheduleDTO;
use App\Models\Schedule;
use App\Repositories\ScheduleRepository;
use Illuminate\Database\Eloquent\Collection;
use RuntimeException;

class ScheduleService
{
    public function __construct(
        private readonly ScheduleRepository $scheduleRepository
    ) {}

    public function list(): Collection
    {
        return $this->scheduleRepository->getAll();
    }

    public function find(int $id): ?Schedule
    {
        return $this->scheduleRepository->findById($id);
    }

    public function createSchedule(ScheduleDTO $dto): Schedule
    {
        // Check if schedule already exists for this doctor, date, and time
        $existing = $this->scheduleRepository->findByDoctorAndSlot(
            $dto->doctorId,
            $dto->date,
            $dto->timeType
        );

        if ($existing) {
            // Update existing
            $this->scheduleRepository->update($existing->id, $dto->toArray());
            return $this->find($existing->id);
        }

        return $this->scheduleRepository->create($dto->toArray());
    }

    public function update(int $id, array $payload): Schedule
    {
        if (!$this->scheduleRepository->update($id, $payload)) {
            throw new RuntimeException('Schedule not found.');
        }

        $schedule = $this->find($id);
        if (!$schedule) {
            throw new RuntimeException('Schedule not found.');
        }

        return $schedule;
    }

    public function delete(int $id): void
    {
        if (!$this->scheduleRepository->delete($id)) {
            throw new RuntimeException('Schedule not found.');
        }
    }

    public function getDoctorSchedules(int $doctorId): Collection
    {
        return $this->scheduleRepository->getByDoctorId($doctorId);
    }
}

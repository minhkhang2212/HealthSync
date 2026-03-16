<?php

namespace App\Services;

use App\Helpers\TimeHelper;
use App\Models\Schedule;
use App\Repositories\ScheduleRepository;
use Illuminate\Support\Collection as SupportCollection;
use RuntimeException;

class ScheduleService
{
    public function __construct(
        private readonly ScheduleRepository $scheduleRepository
    ) {}

    public function find(int $id): ?Schedule
    {
        return $this->scheduleRepository->findById($id);
    }

    public function resolveDoctorScheduleForDate(int $doctorId, string $date): SupportCollection
    {
        $existing = $this->scheduleRepository->getByDoctorAndDate($doctorId, $date)->keyBy('timeType');
        $slots = [];

        foreach (TimeHelper::timeTypeKeys() as $timeType) {
            /** @var Schedule|null $schedule */
            $schedule = $existing->get($timeType);
            if ($schedule) {
                $slots[] = [
                    'id' => $schedule->id,
                    'doctorId' => $schedule->doctorId,
                    'date' => $schedule->date,
                    'timeType' => $schedule->timeType,
                    'currentNumber' => (int) $schedule->currentNumber,
                    'isActive' => (bool) $schedule->isActive,
                    'isSynthetic' => false,
                ];
                continue;
            }

            $slots[] = [
                'id' => null,
                'doctorId' => $doctorId,
                'date' => $date,
                'timeType' => $timeType,
                'currentNumber' => 0,
                'isActive' => true,
                'isSynthetic' => true,
            ];
        }

        return collect($slots);
    }

    public function syncDoctorDayAvailability(int $doctorId, string $date, array $disabledTimeTypes): SupportCollection
    {
        $validTimeTypes = TimeHelper::timeTypeKeys();
        $disabled = array_values(array_unique($disabledTimeTypes));
        $invalid = array_values(array_diff($disabled, $validTimeTypes));

        if ($invalid !== []) {
            throw new RuntimeException('Invalid timeType in disabled slots.');
        }

        $disabledSet = array_fill_keys($disabled, true);
        $existingByTime = $this->scheduleRepository->getByDoctorAndDate($doctorId, $date)->keyBy('timeType');
        $synced = [];

        foreach ($validTimeTypes as $timeType) {
            $isActive = !isset($disabledSet[$timeType]);
            /** @var Schedule|null $slot */
            $slot = $existingByTime->get($timeType);

            if ($slot) {
                if (!$isActive && $slot->currentNumber > 0) {
                    throw new RuntimeException("Cannot disable {$timeType} because it already has a booking.");
                }

                $needsUpdate = ((bool) $slot->isActive !== $isActive);
                if ($needsUpdate) {
                    $this->scheduleRepository->update($slot->id, [
                        'isActive' => $isActive,
                    ]);
                    $slot = $this->find($slot->id);
                }

                if (!$slot) {
                    throw new RuntimeException('Schedule not found.');
                }

                $synced[] = $slot;
                continue;
            }

            $synced[] = $this->scheduleRepository->create([
                'doctorId' => $doctorId,
                'date' => $date,
                'timeType' => $timeType,
                'currentNumber' => 0,
                'isActive' => $isActive,
            ]);
        }

        return collect($synced)->sortBy(function (Schedule $slot) {
            return (int) preg_replace('/\D/', '', (string) $slot->timeType);
        })->values();
    }
}

<?php

namespace App\Services;

use App\DTO\BookingDTO;
use App\Helpers\TimeHelper;
use App\Models\Booking;
use App\Repositories\BookingRepository;
use App\Repositories\ScheduleRepository;
use Exception;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class BookingService
{
    public function __construct(
        private readonly BookingRepository $bookingRepository,
        private readonly ScheduleRepository $scheduleRepository
    ) {}

    public function list(): Collection
    {
        return $this->bookingRepository->getAll();
    }

    public function find(int $id): ?Booking
    {
        return $this->bookingRepository->findById($id);
    }

    public function getByPatientId(int $patientId): Collection
    {
        return $this->bookingRepository->getByPatientId($patientId);
    }

    public function getByDoctorId(int $doctorId): Collection
    {
        return $this->bookingRepository->getByDoctorId($doctorId);
    }

    public function createBooking(BookingDTO $dto): Booking
    {
        if (!TimeHelper::isBookingWindowValid($dto->date, $dto->timeType)) {
            throw new Exception("Invalid booking window. Allowed range is Today to Today + 2 days.");
        }

        return DB::transaction(function () use ($dto) {
            // 1. Find + lock the schedule for this doctor/date/time
            $lockedSchedule = $this->scheduleRepository->findByDoctorAndSlotForUpdate(
                $dto->doctorId,
                $dto->date,
                $dto->timeType
            );

            if (!$lockedSchedule) {
                throw new Exception("No schedule found for the selected time.");
            }

            // 2. Check capacity
            $this->preventOverbooking($lockedSchedule);

            // 3. Increment currentNumber in schedule
            $this->scheduleRepository->update($lockedSchedule->id, [
                'currentNumber' => $lockedSchedule->currentNumber + 1
            ]);

            // 4. Create the booking
            return $this->bookingRepository->create($dto->toArray());
        });
    }

    public function update(int $id, array $payload): Booking
    {
        if (!$this->bookingRepository->update($id, $payload)) {
            throw new RuntimeException("Booking not found.");
        }

        $booking = $this->find($id);
        if (!$booking) {
            throw new RuntimeException("Booking not found.");
        }

        return $booking;
    }

    public function cancelBooking(int $id, int $userId, string $role): Booking
    {
        $booking = $this->find($id);
        if (!$booking) {
            throw new Exception("Booking not found.");
        }

        if (in_array($booking->statusId, ['S2', 'S3', 'S4'], true)) {
            throw new Exception("Booking cannot be cancelled from the current status.");
        }

        // Patients can cancel anytime, Doctors have a 24h rule
        if ($role === 'R2' && !TimeHelper::isDoctorCancellationAllowed($booking->date, $booking->timeType)) {
            throw new Exception("Doctors must cancel at least 24 hours in advance.");
        }

        return DB::transaction(function () use ($booking) {
            // Update booking status to 'S2' (Cancelled)
            $this->bookingRepository->update($booking->id, ['statusId' => 'S2']);

            // Decrease current number in schedule
            $lockedSchedule = $this->scheduleRepository->findByDoctorAndSlotForUpdate(
                $booking->doctorId,
                $booking->date,
                $booking->timeType
            );

            if ($lockedSchedule) {
                if ($lockedSchedule->currentNumber > 0) {
                    $this->scheduleRepository->update($lockedSchedule->id, [
                        'currentNumber' => $lockedSchedule->currentNumber - 1
                    ]);
                }
            }

            $updatedBooking = $this->find($booking->id);
            if (!$updatedBooking) {
                throw new RuntimeException("Booking not found.");
            }

            return $updatedBooking;
        });
    }

    private function preventOverbooking($schedule): void
    {
        if ($schedule->currentNumber >= $schedule->maxNumber) {
            throw new Exception("This time slot is fully booked.");
        }
    }
}

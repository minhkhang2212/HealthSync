<?php

namespace App\Services;

use App\DTO\BookingDTO;
use App\Helpers\TimeHelper;
use App\Models\Booking;
use App\Repositories\BookingRepository;
use App\Repositories\ScheduleRepository;
use Exception;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\QueryException;
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

    public function getByDoctorIdForDate(int $doctorId, ?string $date = null): Collection
    {
        return $this->bookingRepository->getByDoctorId($doctorId, $date);
    }

    public function createBooking(BookingDTO $dto): Booking
    {
        if (!TimeHelper::isBookingWindowValid($dto->date, $dto->timeType)) {
            throw new Exception("Invalid booking window. Allowed range is Today to Today + 30 days.");
        }

        return DB::transaction(function () use ($dto) {
            // 1. Find + lock the schedule for this doctor/date/time
            $lockedSchedule = $this->scheduleRepository->findByDoctorAndSlotForUpdate(
                $dto->doctorId,
                $dto->date,
                $dto->timeType
            );

            if (!$lockedSchedule) {
                try {
                    $this->scheduleRepository->create([
                        'doctorId' => $dto->doctorId,
                        'date' => $dto->date,
                        'timeType' => $dto->timeType,
                        'currentNumber' => 0,
                        'isActive' => true,
                    ]);
                } catch (QueryException) {
                    // Another request may have created this slot concurrently.
                }

                $lockedSchedule = $this->scheduleRepository->findByDoctorAndSlotForUpdate(
                    $dto->doctorId,
                    $dto->date,
                    $dto->timeType
                );
            }

            if (!$lockedSchedule) {
                throw new Exception("No schedule found for the selected time.");
            }

            if ($lockedSchedule->isActive === false) {
                throw new Exception("This time slot is unavailable.");
            }

            // 2. Check capacity
            $this->preventOverbooking($lockedSchedule);

            // 3. Mark the slot as occupied
            $this->scheduleRepository->update($lockedSchedule->id, [
                'currentNumber' => 1,
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

        if ($booking->confirmedAt !== null || in_array($booking->statusId, ['S2', 'S3', 'S4'], true)) {
            throw new Exception("Booking cannot be cancelled from the current status.");
        }

        // Patients can cancel anytime, Doctors have a 24h rule
        if ($role === 'R2' && !TimeHelper::isDoctorCancellationAllowed($booking->date, $booking->timeType)) {
            throw new Exception("Doctors must cancel at least 24 hours in advance.");
        }

        return DB::transaction(function () use ($booking) {
            // Update booking status to 'S2' (Cancelled)
            $this->bookingRepository->update($booking->id, ['statusId' => 'S2']);

            // Re-open the slot when the booking is cancelled
            $lockedSchedule = $this->scheduleRepository->findByDoctorAndSlotForUpdate(
                $booking->doctorId,
                $booking->date,
                $booking->timeType
            );

            if ($lockedSchedule) {
                if ($lockedSchedule->currentNumber > 0) {
                    $this->scheduleRepository->update($lockedSchedule->id, [
                        'currentNumber' => 0,
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

    public function confirmBooking(int $id, ?string $confirmationAttachment = null): Booking
    {
        $booking = $this->find($id);
        if (!$booking) {
            throw new RuntimeException("Booking not found.");
        }

        if ($booking->statusId !== 'S1') {
            throw new RuntimeException("Only new bookings can be confirmed.");
        }

        if ($booking->confirmedAt !== null) {
            throw new RuntimeException("Booking has already been confirmed.");
        }

        $payload = [
            'confirmedAt' => now('Europe/London'),
        ];

        if ($confirmationAttachment !== null) {
            $payload['confirmationAttachment'] = $confirmationAttachment;
        }

        return $this->update($id, $payload);
    }

    public function sendPrescription(int $id, string $prescriptionAttachment): Booking
    {
        $booking = $this->find($id);
        if (!$booking) {
            throw new RuntimeException("Booking not found.");
        }

        if ($booking->statusId !== 'S1' || $booking->confirmedAt === null) {
            throw new RuntimeException("Booking must be confirmed before sending prescription.");
        }

        return $this->update($id, [
            'statusId' => 'S3',
            'prescriptionSentAt' => now('Europe/London'),
            'prescriptionAttachment' => $prescriptionAttachment,
        ]);
    }

    public function markNoShowByDoctor(int $id): Booking
    {
        $booking = $this->find($id);
        if (!$booking) {
            throw new RuntimeException("Booking not found.");
        }

        if ($booking->statusId !== 'S1' || $booking->confirmedAt === null) {
            throw new RuntimeException("Booking must be confirmed before marking no-show.");
        }

        return $this->update($id, ['statusId' => 'S4']);
    }

    private function preventOverbooking($schedule): void
    {
        if ($schedule->currentNumber >= 1) {
            throw new Exception("This time slot is already booked.");
        }
    }
}

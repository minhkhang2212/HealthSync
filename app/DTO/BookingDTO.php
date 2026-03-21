<?php

namespace App\DTO;

class BookingDTO
{
    public function __construct(
        public int $patientId,
        public int $doctorId,
        public string $date,
        public string $timeType,
        public string $statusId,
        public string $patientContactEmail,
        public string $paymentMethod = 'pay_at_clinic',
        public string $paymentStatus = 'pay_at_clinic',
        public ?int $paymentAmount = null,
        public string $paymentCurrency = 'gbp',
        public array $bookingDetails = [],
    ) {}

    public static function fromRequest(array $data): self
    {
        return new self(
            $data['patientId'],
            $data['doctorId'],
            $data['date'],
            $data['timeType'],
            $data['statusId'] ?? 'S1', // Default status 'S1' = new booking
            $data['patientContactEmail'],
            $data['paymentMethod'] ?? 'pay_at_clinic',
            $data['paymentStatus'] ?? 'pay_at_clinic',
            isset($data['paymentAmount']) ? (int) $data['paymentAmount'] : null,
            $data['paymentCurrency'] ?? 'gbp',
            $data['bookingDetails'] ?? [],
        );
    }

    public function toArray(): array
    {
        return [
            'patientId' => $this->patientId,
            'doctorId' => $this->doctorId,
            'date' => $this->date,
            'timeType' => $this->timeType,
            'statusId' => $this->statusId,
            'patientContactEmail' => $this->patientContactEmail,
            'paymentMethod' => $this->paymentMethod,
            'paymentStatus' => $this->paymentStatus,
            'paymentAmount' => $this->paymentAmount,
            'paymentCurrency' => $this->paymentCurrency,
            'bookingDetails' => $this->bookingDetails,
        ];
    }
}

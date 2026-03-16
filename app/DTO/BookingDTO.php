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
        public string $patientContactEmail
    ) {}

    public static function fromRequest(array $data): self
    {
        return new self(
            $data['patientId'],
            $data['doctorId'],
            $data['date'],
            $data['timeType'],
            $data['statusId'] ?? 'S1', // Default status 'S1' = new booking
            $data['patientContactEmail']
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
        ];
    }
}

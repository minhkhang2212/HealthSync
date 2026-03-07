<?php

namespace App\DTO;

class ScheduleDTO
{
    public function __construct(
        public int $doctorId,
        public string $date,
        public string $timeType,
        public int $maxNumber = 5,
        public int $currentNumber = 0
    ) {}

    public static function fromRequest(array $data): self
    {
        return new self(
            $data['doctorId'],
            $data['date'],
            $data['timeType'],
            $data['maxNumber'] ?? 5,
            $data['currentNumber'] ?? 0
        );
    }

    public function toArray(): array
    {
        return [
            'doctorId' => $this->doctorId,
            'date' => $this->date,
            'timeType' => $this->timeType,
            'maxNumber' => $this->maxNumber,
            'currentNumber' => $this->currentNumber,
        ];
    }
}

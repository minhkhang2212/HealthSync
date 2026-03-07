<?php

namespace App\DTO;

class DoctorDTO
{
    public function __construct(
        public int $doctorId,
        public ?string $priceId,
        public ?string $provinceId,
        public ?string $paymentId,
        public ?string $addressClinic,
        public ?string $nameClinic,
        public ?string $note
    ) {}

    public static function fromRequest(array $data, int $doctorId): self
    {
        return new self(
            $doctorId,
            $data['priceId'] ?? null,
            $data['provinceId'] ?? null,
            $data['paymentId'] ?? null,
            $data['addressClinic'] ?? null,
            $data['nameClinic'] ?? null,
            $data['note'] ?? null
        );
    }

    public function toArray(): array
    {
        return array_filter([
            'doctorId' => $this->doctorId,
            'priceId' => $this->priceId,
            'provinceId' => $this->provinceId,
            'paymentId' => $this->paymentId,
            'addressClinic' => $this->addressClinic,
            'nameClinic' => $this->nameClinic,
            'note' => $this->note,
        ], fn($value) => !is_null($value));
    }
}

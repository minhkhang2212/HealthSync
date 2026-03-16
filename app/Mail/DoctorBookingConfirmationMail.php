<?php

namespace App\Mail;

use App\Helpers\TimeHelper;
use App\Models\Booking;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

class DoctorBookingConfirmationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Booking $booking
    ) {}

    public function build(): self
    {
        $mail = $this
            ->subject('Appointment Confirmation - HealthSync')
            ->view('emails.booking-confirmation', [
                'booking' => $this->booking,
                'appointmentDate' => TimeHelper::parseLondon($this->booking->date)->format('l, d M Y'),
                'appointmentTime' => TimeHelper::timeLabelFor($this->booking->timeType),
            ]);

        $attachmentPath = $this->resolveStoragePath($this->booking->confirmationAttachment);
        if ($attachmentPath !== null && Storage::disk('public')->exists($attachmentPath)) {
            $mail->attach(Storage::disk('public')->path($attachmentPath), [
                'as' => basename($attachmentPath),
            ]);
        }

        return $mail;
    }

    private function resolveStoragePath(?string $publicPath): ?string
    {
        if (!is_string($publicPath) || !str_starts_with($publicPath, '/storage/')) {
            return null;
        }

        return substr($publicPath, strlen('/storage/'));
    }
}

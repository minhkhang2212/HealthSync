<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Booking extends Model
{
    use HasFactory;

    protected $table = 'booking';

    protected $fillable = [
        'patientId',
        'doctorId',
        'patientContactEmail',
        'bookingDetails',
        'date',
        'timeType',
        'statusId',
        'paymentMethod',
        'paymentStatus',
        'paymentAmount',
        'paymentCurrency',
        'stripeCheckoutSessionId',
        'stripePaymentIntentId',
        'paymentExpiresAt',
        'paidAt',
        'confirmedAt',
        'confirmationAttachment',
        'prescriptionSentAt',
        'prescriptionAttachment',
    ];

    protected $casts = [
        'bookingDetails' => 'array',
        'paymentAmount' => 'integer',
        'paymentExpiresAt' => 'datetime',
        'paidAt' => 'datetime',
        'confirmedAt' => 'datetime',
        'prescriptionSentAt' => 'datetime',
    ];

    public function patient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'patientId');
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'doctorId');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DoctorClinicSpecialty extends Model
{
    use HasFactory;

    protected $table = 'doctor_clinic_specialty';

    protected $fillable = [
        'doctorId',
        'clinicId',
        'specialtyId',
    ];

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'doctorId');
    }

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class, 'clinicId');
    }

    public function specialty(): BelongsTo
    {
        return $this->belongsTo(Specialty::class, 'specialtyId');
    }
}

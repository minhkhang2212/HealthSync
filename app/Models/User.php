<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, HasApiTokens, HasRoles;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'roleId',
        'positionId',
        'gender',
        'phoneNumber',
        'image',
        'isActive',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'isActive' => 'boolean',
        ];
    }

    public function bookingsAsPatient(): HasMany
    {
        return $this->hasMany(Booking::class, 'patientId');
    }

    public function bookingsAsDoctor(): HasMany
    {
        return $this->hasMany(Booking::class, 'doctorId');
    }

    public function schedules(): HasMany
    {
        return $this->hasMany(Schedule::class, 'doctorId');
    }

    public function doctorInfor(): HasOne
    {
        return $this->hasOne(DoctorInfor::class, 'doctorId');
    }

    public function doctorClinicSpecialties(): HasMany
    {
        return $this->hasMany(DoctorClinicSpecialty::class, 'doctorId');
    }
}

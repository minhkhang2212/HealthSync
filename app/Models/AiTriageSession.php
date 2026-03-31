<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AiTriageSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'patientId',
        'status',
    ];

    public function patient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'patientId');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(AiTriageMessage::class, 'sessionId');
    }
}

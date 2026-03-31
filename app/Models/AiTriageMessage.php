<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiTriageMessage extends Model
{
    use HasFactory;

    protected $fillable = [
        'sessionId',
        'role',
        'content',
        'providerName',
        'providerModel',
        'latencyMs',
        'structuredOutput',
    ];

    protected $casts = [
        'latencyMs' => 'integer',
        'structuredOutput' => 'array',
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(AiTriageSession::class, 'sessionId');
    }
}

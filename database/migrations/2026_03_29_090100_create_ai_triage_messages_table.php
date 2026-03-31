<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_triage_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sessionId')->constrained('ai_triage_sessions')->cascadeOnDelete();
            $table->string('role', 20);
            $table->text('content')->nullable();
            $table->string('providerName')->nullable();
            $table->string('providerModel')->nullable();
            $table->unsignedInteger('latencyMs')->nullable();
            $table->json('structuredOutput')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_triage_messages');
    }
};

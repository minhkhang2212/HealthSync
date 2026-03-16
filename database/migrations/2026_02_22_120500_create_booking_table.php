<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('booking', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patientId')->constrained('users')->cascadeOnDelete();
            $table->foreignId('doctorId')->constrained('users')->cascadeOnDelete();
            $table->string('patientContactEmail')->nullable();
            $table->date('date');
            $table->string('timeType', 20);
            $table->string('statusId', 20);
            $table->timestamps();

            $table->index('patientId');
            $table->index(['doctorId', 'date', 'timeType']);
            $table->index('statusId');
            $table->unique(['patientId', 'doctorId', 'date', 'timeType'], 'booking_patient_doctor_slot_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('booking');
    }
};

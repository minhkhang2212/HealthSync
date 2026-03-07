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
        Schema::create('history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patientId')->constrained('users')->cascadeOnDelete();
            $table->foreignId('doctorId')->constrained('users')->cascadeOnDelete();
            $table->foreignId('bookingId')->nullable()->constrained('booking')->nullOnDelete();
            $table->text('description')->nullable();
            $table->longText('files')->nullable();
            $table->timestamps();

            $table->index('patientId');
            $table->index('doctorId');
            $table->index('bookingId');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('history');
    }
};

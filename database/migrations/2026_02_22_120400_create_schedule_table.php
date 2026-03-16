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
        Schema::create('schedule', function (Blueprint $table) {
            $table->id();
            $table->foreignId('doctorId')->constrained('users')->cascadeOnDelete();
            $table->date('date');
            $table->string('timeType', 20);
            $table->unsignedInteger('currentNumber')->default(0);
            $table->timestamps();

            $table->unique(['doctorId', 'date', 'timeType']);
            $table->index(['date', 'timeType']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('schedule');
    }
};

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
        if (!Schema::hasColumn('schedule', 'maxNumber')) {
            return;
        }

        Schema::table('schedule', function (Blueprint $table) {
            $table->dropColumn('maxNumber');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('schedule', 'maxNumber')) {
            return;
        }

        Schema::table('schedule', function (Blueprint $table) {
            $table->unsignedInteger('maxNumber')->default(1)->after('timeType');
        });
    }
};

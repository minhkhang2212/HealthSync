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
        Schema::table('booking', function (Blueprint $table) {
            if (!Schema::hasColumn('booking', 'confirmedAt')) {
                $table->timestamp('confirmedAt')->nullable()->after('statusId');
            }

            if (!Schema::hasColumn('booking', 'confirmationAttachment')) {
                $table->string('confirmationAttachment')->nullable()->after('confirmedAt');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('booking', function (Blueprint $table) {
            if (Schema::hasColumn('booking', 'confirmationAttachment')) {
                $table->dropColumn('confirmationAttachment');
            }

            if (Schema::hasColumn('booking', 'confirmedAt')) {
                $table->dropColumn('confirmedAt');
            }
        });
    }
};

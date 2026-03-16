<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('allcodes') || !Schema::hasColumn('allcodes', 'valueVi')) {
            return;
        }

        Schema::table('allcodes', function (Blueprint $table) {
            $table->dropColumn('valueVi');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('allcodes') || Schema::hasColumn('allcodes', 'valueVi')) {
            return;
        }

        Schema::table('allcodes', function (Blueprint $table) {
            $table->string('valueVi', 255)->default('')->after('valueEn');
        });

        DB::table('allcodes')->update([
            'valueVi' => DB::raw('valueEn'),
        ]);
    }
};

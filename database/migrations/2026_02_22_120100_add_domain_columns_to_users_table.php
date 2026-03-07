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
        Schema::table('users', function (Blueprint $table) {
            $table->string('roleId', 20)->nullable()->after('password');
            $table->string('positionId', 20)->nullable()->after('roleId');
            $table->string('gender', 20)->nullable()->after('positionId');
            $table->string('phoneNumber', 30)->nullable()->after('gender');
            $table->text('image')->nullable()->after('phoneNumber');

            $table->index('roleId');
            $table->index('positionId');
            $table->index('gender');
            $table->index('phoneNumber');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['roleId']);
            $table->dropIndex(['positionId']);
            $table->dropIndex(['gender']);
            $table->dropIndex(['phoneNumber']);

            $table->dropColumn([
                'roleId',
                'positionId',
                'gender',
                'phoneNumber',
                'image',
            ]);
        });
    }
};

package com.shuayb.recruitment.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.shuayb.recruitment.model.AgencySettings
import kotlinx.coroutines.flow.Flow

@Dao
interface AgencySettingsDao {
    @Query("SELECT * FROM agency_settings WHERE id = 1 LIMIT 1")
    fun getSettings(): Flow<AgencySettings?>

    @Query("SELECT * FROM agency_settings WHERE id = 1 LIMIT 1")
    suspend fun getSettingsOnce(): AgencySettings?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveSettings(settings: AgencySettings)
}

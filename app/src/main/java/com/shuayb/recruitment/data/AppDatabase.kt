package com.shuayb.recruitment.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.sqlite.db.SupportSQLiteDatabase
import com.shuayb.recruitment.model.AgencySettings
import com.shuayb.recruitment.model.Candidate
import com.shuayb.recruitment.model.GeneralExpense
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

@Database(
    entities = [Candidate::class, GeneralExpense::class, AgencySettings::class],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun candidateDao(): CandidateDao
    abstract fun generalExpenseDao(): GeneralExpenseDao
    abstract fun agencySettingsDao(): AgencySettingsDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context, scope: CoroutineScope): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "shuayb_recruitment.db"
                ).addCallback(DatabaseCallback(scope))
                .fallbackToDestructiveMigration()
                .build()
                INSTANCE = instance
                instance
            }
        }

        private class DatabaseCallback(
            private val scope: CoroutineScope
        ) : RoomDatabase.Callback() {
            override fun onCreate(db: SupportSQLiteDatabase) {
                super.onCreate(db)
                INSTANCE?.let { database ->
                    scope.launch(Dispatchers.IO) {
                        populateInitialData(database)
                    }
                }
            }
        }

        suspend fun populateInitialData(db: AppDatabase) {
            db.agencySettingsDao().saveSettings(SampleData.defaultSettings)
            db.candidateDao().insertCandidates(SampleData.sampleCandidates)
            db.generalExpenseDao().insertExpenses(SampleData.sampleExpenses)
        }
    }
}

package com.shuayb.recruitment.ui.theme

import androidx.compose.ui.graphics.Color

val NavyPrimary = Color(0xFF172A46)
val NavyDark = Color(0xFF0F1D32)
val NavyLight = Color(0xFF223B61)

val GoldAccent = Color(0xFFC9A84C)
val GoldLight = Color(0xFFDFBF69)
val GoldDark = Color(0xFFA68532)

val BgCream = Color(0xFFFDFCFB)
val BgLightGray = Color(0xFFF6F8FA)
val SurfaceWhite = Color(0xFFFFFFFF)
val SurfaceCard = Color(0xFFFFFFFF)

val TextPrimary = Color(0xFF1A1C1E)
val TextSecondary = Color(0xFF64748B)
val TextTertiary = Color(0xFF94A3B8)

val BorderSubtle = Color(0xFFE2E8F0)
val BorderStrong = Color(0xFFCBD5E1)

// Stage Colors
val StageNewColor = Color(0xFF2563EB)
val StageInterviewColor = Color(0xFF4F46E5)
val StageMedicalColor = Color(0xFFD97706)
val StageTrainingColor = Color(0xFFEA580C)
val StageContractColor = Color(0xFF9333EA)
val StageVisaColor = Color(0xFFDB2777)
val StageFlightColor = Color(0xFF0891B2)
val StageReadyColor = Color(0xFF059669)
val StageTravelledColor = Color(0xFF16A34A)
val StageCompletedColor = Color(0xFF475569)
val StageCancelledColor = Color(0xFFDC2626)

fun getStageColor(stage: String): Color {
    return when (stage.uppercase()) {
        "NEW" -> StageNewColor
        "INTERVIEW" -> StageInterviewColor
        "MEDICAL" -> StageMedicalColor
        "TRAINING" -> StageTrainingColor
        "CONTRACT" -> StageContractColor
        "VISA" -> StageVisaColor
        "FLIGHT" -> StageFlightColor
        "READY" -> StageReadyColor
        "TRAVELLED" -> StageTravelledColor
        "COMPLETED" -> StageCompletedColor
        "CANCELLED" -> StageCancelledColor
        else -> StageNewColor
    }
}

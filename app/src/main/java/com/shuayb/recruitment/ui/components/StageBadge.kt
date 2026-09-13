package com.shuayb.recruitment.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.shuayb.recruitment.model.StageId
import com.shuayb.recruitment.ui.theme.getStageColor

@Composable
fun StageBadge(
    stageStr: String,
    modifier: Modifier = Modifier
) {
    val stageEnum = StageId.fromString(stageStr)
    val baseColor = getStageColor(stageStr)

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(8.dp))
            .background(baseColor.copy(alpha = 0.12f))
            .border(1.dp, baseColor.copy(alpha = 0.35f), RoundedCornerShape(8.dp))
            .padding(horizontal = 8.dp, vertical = 4.dp)
    ) {
        Text(
            text = stageEnum.label,
            color = baseColor,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold
        )
    }
}

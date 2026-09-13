package com.shuayb.recruitment.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Archive
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Female
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material.icons.filled.Male
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.shuayb.recruitment.data.FinanceUtils
import com.shuayb.recruitment.model.AgencySettings
import com.shuayb.recruitment.model.Candidate
import com.shuayb.recruitment.model.StageId
import com.shuayb.recruitment.ui.components.StageBadge
import com.shuayb.recruitment.ui.theme.BorderSubtle
import com.shuayb.recruitment.ui.theme.GoldAccent
import com.shuayb.recruitment.ui.theme.NavyDark
import com.shuayb.recruitment.ui.theme.NavyPrimary

@Composable
fun CandidateListScreen(
    candidates: List<Candidate>,
    settings: AgencySettings,
    searchQuery: String,
    stageFilter: String?,
    onSearchChange: (String) -> Unit,
    onStageFilterChange: (String?) -> Unit,
    onSelectCandidate: (String) -> Unit,
    onOpenAddCandidate: () -> Unit,
    onEditCandidate: (Candidate) -> Unit,
    onArchiveCandidate: (String, Boolean) -> Unit
) {
    var selectedGender by remember { mutableStateOf<String?>(null) }

    // Filter candidates
    val filtered = candidates.filter { c ->
        val matchesQuery = searchQuery.isBlank() ||
                c.fullName.contains(searchQuery, ignoreCase = true) ||
                c.phone.contains(searchQuery, ignoreCase = true) ||
                c.passportNumber.contains(searchQuery, ignoreCase = true) ||
                c.id.contains(searchQuery, ignoreCase = true) ||
                c.job.contains(searchQuery, ignoreCase = true) ||
                c.sponsorName.contains(searchQuery, ignoreCase = true) ||
                c.agentName.contains(searchQuery, ignoreCase = true)

        val matchesStage = stageFilter == null || c.stage.equals(stageFilter, ignoreCase = true)
        val matchesGender = selectedGender == null || c.gender.equals(selectedGender, ignoreCase = true)

        matchesQuery && matchesStage && matchesGender
    }

    Box(modifier = Modifier.fillMaxSize()) {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                Spacer(modifier = Modifier.height(4.dp))
                // Search Bar
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = onSearchChange,
                    modifier = Modifier.fillMaxWidth(),
                    placeholder = { Text("بحث بالاسم، رقم الجواز، الهاتف، أو الوظيفة...", fontSize = 13.sp) },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = NavyPrimary) },
                    trailingIcon = {
                        if (searchQuery.isNotBlank()) {
                            IconButton(onClick = { onSearchChange("") }) {
                                Icon(Icons.Default.Close, contentDescription = "مسح")
                            }
                        }
                    },
                    shape = RoundedCornerShape(14.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = NavyPrimary,
                        unfocusedBorderColor = BorderSubtle,
                        focusedContainerColor = MaterialTheme.colorScheme.surface,
                        unfocusedContainerColor = MaterialTheme.colorScheme.surface
                    ),
                    singleLine = true
                )
            }

            // Gender & Stage Filter Chips
            item {
                Column {
                    // Stage filter chips
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        item {
                            FilterChip(
                                selected = stageFilter == null,
                                onClick = { onStageFilterChange(null) },
                                label = { Text("كل المراحل (${candidates.size})", fontSize = 11.sp) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = NavyPrimary,
                                    selectedLabelColor = Color.White
                                )
                            )
                        }

                        items(StageId.entries) { stage ->
                            val count = candidates.count { it.stage.equals(stage.name, ignoreCase = true) }
                            FilterChip(
                                selected = stageFilter == stage.name,
                                onClick = {
                                    onStageFilterChange(if (stageFilter == stage.name) null else stage.name)
                                },
                                label = { Text("${stage.label} ($count)", fontSize = 11.sp) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = NavyPrimary,
                                    selectedLabelColor = Color.White
                                )
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    // Gender quick toggles
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "النوع:",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color.Gray
                        )

                        FilterChip(
                            selected = selectedGender == null,
                            onClick = { selectedGender = null },
                            label = { Text("الكل", fontSize = 10.sp) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = GoldAccent,
                                selectedLabelColor = NavyDark
                            )
                        )

                        FilterChip(
                            selected = selectedGender == "female",
                            onClick = { selectedGender = if (selectedGender == "female") null else "female" },
                            label = { Text("إناث", fontSize = 10.sp) },
                            leadingIcon = { Icon(Icons.Default.Female, contentDescription = null, modifier = Modifier.size(14.dp)) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = GoldAccent,
                                selectedLabelColor = NavyDark
                            )
                        )

                        FilterChip(
                            selected = selectedGender == "male",
                            onClick = { selectedGender = if (selectedGender == "male") null else "male" },
                            label = { Text("ذكور", fontSize = 10.sp) },
                            leadingIcon = { Icon(Icons.Default.Male, contentDescription = null, modifier = Modifier.size(14.dp)) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = GoldAccent,
                                selectedLabelColor = NavyDark
                            )
                        )

                        Spacer(modifier = Modifier.weight(1f))
                        Text(
                            text = "${filtered.size} مرشح",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = NavyPrimary
                        )
                    }
                }
            }

            // Candidates List
            if (filtered.isEmpty()) {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 40.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(
                                imageVector = Icons.Default.Search,
                                contentDescription = null,
                                tint = Color.LightGray,
                                modifier = Modifier.size(48.dp)
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "لا يوجد مرشحون يطابقون خيارات البحث",
                                color = Color.Gray,
                                fontSize = 13.sp
                            )
                        }
                    }
                }
            } else {
                items(filtered, key = { it.id }) { candidate ->
                    CandidateCardItem(
                        candidate = candidate,
                        currency = settings.currency,
                        onClick = { onSelectCandidate(candidate.id) },
                        onEdit = { onEditCandidate(candidate) },
                        onArchive = { onArchiveCandidate(candidate.id, true) }
                    )
                }
            }

            item {
                Spacer(modifier = Modifier.height(90.dp))
            }
        }

        // Floating Action Button to Add Candidate
        FloatingActionButton(
            onClick = onOpenAddCandidate,
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(bottom = 80.dp, end = 20.dp),
            containerColor = GoldAccent,
            contentColor = NavyDark,
            shape = CircleShape
        ) {
            Icon(Icons.Default.Add, contentDescription = "إضافة مرشح جديد", modifier = Modifier.size(28.dp))
        }
    }
}

@Composable
fun CandidateCardItem(
    candidate: Candidate,
    currency: String,
    onClick: () -> Unit,
    onEdit: () -> Unit,
    onArchive: () -> Unit
) {
    var menuExpanded by remember { mutableStateOf(false) }
    val fin = remember(candidate) { FinanceUtils.calculateCandidateFinance(candidate) }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .border(1.dp, BorderSubtle, RoundedCornerShape(16.dp)),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            // Row 1: Avatar, Name, Job, Stage Badge, More Menu
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.weight(1f)
                ) {
                    Box(
                        modifier = Modifier
                            .size(46.dp)
                            .clip(CircleShape)
                            .background(NavyPrimary.copy(alpha = 0.08f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = candidate.firstName.take(1),
                            color = NavyPrimary,
                            fontWeight = FontWeight.Bold,
                            fontSize = 18.sp
                        )
                    }

                    Spacer(modifier = Modifier.width(10.dp))

                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = candidate.fullName,
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = NavyPrimary
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(4.dp))
                                    .background(Color(0xFFF1F5F9))
                                    .padding(horizontal = 4.dp, vertical = 1.dp)
                            ) {
                                Text(
                                    text = candidate.id,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = Color.Gray
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(2.dp))

                        Text(
                            text = "${candidate.job} • ${candidate.city}",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color.Gray
                        )
                    }
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    StageBadge(stageStr = candidate.stage)

                    Box {
                        IconButton(onClick = { menuExpanded = true }) {
                            Icon(Icons.Default.MoreVert, contentDescription = "خيارات", tint = Color.Gray)
                        }

                        DropdownMenu(
                            expanded = menuExpanded,
                            onDismissRequest = { menuExpanded = false }
                        ) {
                            DropdownMenuItem(
                                text = { Text("عرض وتعديل الملف") },
                                leadingIcon = { Icon(Icons.Default.Edit, contentDescription = null) },
                                onClick = {
                                    menuExpanded = false
                                    onEdit()
                                }
                            )
                            DropdownMenuItem(
                                text = { Text("نقل إلى الأرشيف") },
                                leadingIcon = { Icon(Icons.Default.Archive, contentDescription = null) },
                                onClick = {
                                    menuExpanded = false
                                    onArchive()
                                }
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Row 2: Passport and Contact Badges
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                if (candidate.passportNumber.isNotBlank()) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .background(Color(0xFFF8FAFC))
                            .border(1.dp, BorderSubtle, RoundedCornerShape(6.dp))
                            .padding(horizontal = 8.dp, vertical = 3.dp)
                    ) {
                        Text(
                            text = "جواز: ${candidate.passportNumber}",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                            color = NavyPrimary
                        )
                    }
                }

                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(6.dp))
                        .background(Color(0xFFF8FAFC))
                        .border(1.dp, BorderSubtle, RoundedCornerShape(6.dp))
                        .padding(horizontal = 8.dp, vertical = 3.dp)
                ) {
                    Text(
                        text = "هاتف: ${candidate.phone}",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color.DarkGray
                    )
                }

                if (candidate.sponsorName.isNotBlank()) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .background(GoldAccent.copy(alpha = 0.1f))
                            .padding(horizontal = 8.dp, vertical = 3.dp)
                    ) {
                        Text(
                            text = "الكفيل: ${candidate.sponsorName}",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = NavyDark
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Row 3: Financial Progress Bar & Balance
            Column(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "المسدد: ${FinanceUtils.formatMoney(fin.paid, currency)} (${fin.paymentProgress}%)",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color(0xFF16A34A)
                    )
                    Text(
                        text = "المتبقي: ${FinanceUtils.formatMoney(fin.outstanding, currency)}",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (fin.outstanding > 0) Color(0xFFD97706) else Color.Gray
                    )
                }
                Spacer(modifier = Modifier.height(4.dp))
                LinearProgressIndicator(
                    progress = { fin.paymentProgress / 100f },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(6.dp)
                        .clip(RoundedCornerShape(3.dp)),
                    color = Color(0xFF16A34A),
                    trackColor = Color(0xFFE2E8F0)
                )
            }
        }
    }
}

// Script to update student in_out status to 'In' for null values
// Run this with Node.js: node update-student-status.js

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Load configuration
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

// Initialize Supabase client
const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);

async function updateStudentStatus() {
    try {
        console.log('Starting student status update...\n');

        // Step 1: Check current state
        console.log('Step 1: Checking current student status distribution...');
        const { data: allStudents, error: checkError } = await supabase
            .from('students')
            .select('reg_no, course, in_out');

        if (checkError) throw checkError;

        const totalStudents = allStudents.length;
        const nullStatus = allStudents.filter(s => s.in_out === null || s.in_out === undefined).length;
        const inStatus = allStudents.filter(s => s.in_out === 'In').length;
        const outStatus = allStudents.filter(s => s.in_out === 'Out').length;

        console.log(`  Total students: ${totalStudents}`);
        console.log(`  NULL status: ${nullStatus}`);
        console.log(`  'In' status: ${inStatus}`);
        console.log(`  'Out' status: ${outStatus}\n`);

        if (nullStatus === 0) {
            console.log('✅ No students with NULL status found. All good!');
            return;
        }

        // Step 2: Update NULL values to 'In'
        console.log(`Step 2: Updating ${nullStatus} students with NULL status to 'In'...`);

        // Get students with null in_out
        const studentsToUpdate = allStudents.filter(s => s.in_out === null || s.in_out === undefined);

        // Update in batches
        const batchSize = 100;
        let updatedCount = 0;

        for (let i = 0; i < studentsToUpdate.length; i += batchSize) {
            const batch = studentsToUpdate.slice(i, i + batchSize);
            const regNos = batch.map(s => s.reg_no);

            const { error: updateError } = await supabase
                .from('students')
                .update({ in_out: 'In' })
                .in('reg_no', regNos);

            if (updateError) {
                console.error(`  Error in batch ${i / batchSize + 1}:`, updateError.message);
            } else {
                updatedCount += batch.length;
                console.log(`  Updated batch ${i / batchSize + 1}: ${updatedCount}/${studentsToUpdate.length}`);
            }
        }

        console.log(`\n✅ Successfully updated ${updatedCount} students\n`);

        // Step 3: Verify the update
        console.log('Step 3: Verifying update...');
        const { data: verifyStudents, error: verifyError } = await supabase
            .from('students')
            .select('reg_no, course, in_out');

        if (verifyError) throw verifyError;

        const afterNull = verifyStudents.filter(s => s.in_out === null || s.in_out === undefined).length;
        const afterIn = verifyStudents.filter(s => s.in_out === 'In').length;
        const afterOut = verifyStudents.filter(s => s.in_out === 'Out').length;

        console.log(`  NULL status: ${afterNull}`);
        console.log(`  'In' status: ${afterIn}`);
        console.log(`  'Out' status: ${afterOut}\n`);

        // Step 4: Show count by course
        console.log('Step 4: Student count by course:');
        const courseCounts = {};
        verifyStudents.forEach(student => {
            if (student.in_out === 'In' || student.in_out === null) {
                const key = `${student.reg_no}_${student.course}`;
                if (!courseCounts[student.course]) {
                    courseCounts[student.course] = new Set();
                }
                courseCounts[student.course].add(key);
            }
        });

        // Sort courses and display
        const sortedCourses = Object.keys(courseCounts).sort();
        let totalCount = 0;

        sortedCourses.forEach(course => {
            const count = courseCounts[course].size;
            totalCount += count;
            console.log(`  ${course}: ${count}`);
        });

        console.log(`  -------------------`);
        console.log(`  Total: ${totalCount}`);
        console.log(`\nExpected: CE:110, ME:151, EC:183, CS:189, EE:154, Total:787`);

        if (totalCount === 787) {
            console.log('\n✅ SUCCESS! Student count matches expected value (787)');
        } else {
            console.log(`\n⚠️  WARNING: Student count (${totalCount}) does not match expected value (787)`);
            console.log('   This might be due to data differences in your CSV vs database.');
        }

    } catch (error) {
        console.error('❌ Update failed:', error);
    }
}

// Run update
updateStudentStatus();

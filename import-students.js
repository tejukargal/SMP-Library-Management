// Script to import students from CSV to Supabase
// Run this with Node.js: node import-students.js

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

// Load configuration
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

// Initialize Supabase client
const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);

async function importStudents() {
    try {
        // Read CSV file
        const fileContent = fs.readFileSync('./students.csv', 'utf8');

        // Parse CSV
        const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });

        console.log(`Found ${records.length} students in CSV`);

        // Transform data to match our schema
        const students = records.map(record => ({
            reg_no: record['Reg No']?.trim() || record['Sl No']?.trim(),
            name: record['Student Name']?.trim(),
            father: record['Father Name']?.trim(),
            year: record['Year']?.trim(),
            course: record['Course']?.trim()
        })).filter(student =>
            student.reg_no && student.name && student.father && student.year && student.course
        );

        // Remove duplicates by reg_no, keeping the first occurrence
        const uniqueStudents = [];
        const seenRegNos = new Set();
        for (const student of students) {
            if (!seenRegNos.has(student.reg_no)) {
                uniqueStudents.push(student);
                seenRegNos.add(student.reg_no);
            }
        }

        console.log(`Prepared ${uniqueStudents.length} valid student records (${students.length - uniqueStudents.length} duplicates removed)`);

        // Insert in batches of 100
        const batchSize = 100;
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < uniqueStudents.length; i += batchSize) {
            const batch = uniqueStudents.slice(i, i + batchSize);

            const { data, error } = await supabase
                .from('students')
                .upsert(batch, { onConflict: 'reg_no' });

            if (error) {
                console.error(`Error in batch ${i / batchSize + 1}:`, error.message);
                errorCount += batch.length;
            } else {
                successCount += batch.length;
                console.log(`Inserted batch ${i / batchSize + 1}: ${successCount}/${uniqueStudents.length}`);
            }
        }

        console.log(`\nImport completed!`);
        console.log(`Success: ${successCount} students`);
        console.log(`Errors: ${errorCount} students`);

    } catch (error) {
        console.error('Import failed:', error);
    }
}

// Run import
importStudents();

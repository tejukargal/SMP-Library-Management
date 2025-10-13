# Student Counting Logic

## Overview
The SMP Library Management System uses a special counting methodology to accurately count students across different courses, taking into account that the EE course uses a different registration numbering system.

## The Problem
EE (Electrical Engineering) course students may have registration numbers that overlap with other courses (CE, ME, EC, CS). For example:
- A CS student might have reg_no "001"
- An EE student might also have reg_no "001"
- These are **different students**, not duplicates

However, other courses (CE, ME, EC, CS) share the same registration numbering system, so:
- A CS student with reg_no "001"
- An ME student with reg_no "001"
- These are the **same student** (taking multiple courses or transferred)

## The Solution

### Counting Logic (Implemented in app.js:565-601)

```javascript
// For EE course: Use reg_no + course as unique key
// For other courses: Use reg_no only (deduplicate across courses)

students?.forEach(student => {
    const course = (student.course || '').toUpperCase();
    const regNo = student.reg_no;

    // Unique key generation
    const uniqueKey = course === 'EE' ? `${regNo}_${course}` : regNo;
    uniqueStudents.add(uniqueKey);
});
```

### Examples

**Example 1: EE vs CS overlap**
```
Students in database:
- Reg No: 001, Course: CS, Status: In
- Reg No: 001, Course: EE, Status: In

Result: Counted as 2 students ✅
- CS-001 counted once (key: "001")
- EE-001 counted once (key: "001_EE")
```

**Example 2: CS and ME same reg_no**
```
Students in database:
- Reg No: 002, Course: CS, Status: In
- Reg No: 002, Course: ME, Status: In

Result: Counted as 1 student ✅
- Both use the same key: "002"
- Deduplicated as same student
```

**Example 3: Mixed scenario**
```
Students in database:
- Reg No: 003, Course: CS, Status: In
- Reg No: 003, Course: EC, Status: In
- Reg No: 003, Course: EE, Status: In

Result: Counted as 2 students ✅
- CS and EC counted as 1 (key: "003")
- EE counted separately (key: "003_EE")
```

## Course-Wise Breakdown

The same logic applies to the course-wise breakdown (app.js:603-673):

- **EE Course**: Shows count of unique EE students only (using `reg_no_EE` as key)
- **Other Courses**: Shows count of unique students in that course (using `reg_no` as key, but may overlap with other non-EE courses)

**Note displayed to users:**
> "EE students counted separately by reg_no. Other courses deduplicated by reg_no."

## Status Filtering

Only students with `in_out = 'In'` status are counted:
- ✅ **In**: Currently admitted students (counted)
- ❌ **Out**: Students who have left the college (not counted)

## Reference
This logic matches the implementation in the reference project:
`D:\Apps\Html_SMP Admn Stats_1 25-26\script.js`

Where the same pattern is used:
```javascript
let uniqueKey;
if (course.toUpperCase() === 'EE') {
    uniqueKey = `${regNo}_${course}`;
} else {
    uniqueKey = regNo;
}
```

## Testing

To verify the counting is correct:
1. Check your CSV data for students with same reg_no but different courses
2. Note which are EE vs non-EE courses
3. Expected count = (Unique non-EE reg_nos) + (Unique EE reg_nos)

Example:
```
CSV Data:
001, CS, In
001, EE, In
002, ME, In
002, EC, In
003, EE, In

Expected Total: 4 students
- Non-EE: 2 unique (001, 002)
- EE: 2 unique (001_EE, 003_EE)
```

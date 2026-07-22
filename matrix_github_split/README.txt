Matrix Student System - GitHub split files

นำโฟลเดอร์นี้ขึ้น GitHub Pages โดยคงโครงสร้าง index.html, css/, js/ ไว้เหมือนเดิม

ไฟล์สำคัญ:
- index.html: โครงสร้างหน้าเว็บและ section หลัก
- css/style.css: รูปแบบหน้าจอทั้งหมด
- js/00-config.js: API URL และตัวแปรกลาง
- js/01-utils.js: ฟังก์ชันช่วยเหลือ เช่น escapeHtml, Drive preview
- js/02-auth.js: login และแยกหน้า teacher/student
- js/03-layout.js: สารบัญ/เมนูด้านข้าง/สลับหน้า
- js/04-assignments.js: หน้าใบคำสั่งงาน เพิ่มงาน คะแนนเต็ม ห้อง deadline
- js/05-teacher-work.js: หน้าตรวจงาน เลือกหลายงาน ให้คะแนน ส่งคืน ลบงาน และคะแนนรายบุคคลในงานกลุ่ม
- js/06-student-dashboard.js: หน้านักเรียนและรายการงาน
- js/07-score-table.js: ตารางคะแนนและการบันทึกคะแนนหลายช่อง
- js/08-student-submit.js: popup ส่งงาน/แก้ไขงาน/งานกลุ่ม
- js/09-matrix-bg.js: พื้นหลัง Matrix

import { Servant, Youth, Attendance, ServiceSchedule, AttendanceStatus } from '@/types/database';

export const INITIAL_SERVANTS: Servant[] = [
  {
    "id": "10000000-0000-0000-0000-000000000001",
    "name": "الأخ استيفن امين",
    "phone": "01203042189",
    "role": "admin"
  },
  {
    "id": "10000000-0000-0000-0000-000000000002",
    "name": "الأخ اندرو عوني",
    "phone": "01147871179",
    "role": "admin"
  },
  {
    "id": "10000000-0000-0000-0000-000000000003",
    "name": "الأخ مارتن إسحاق",
    "phone": "01223502628",
    "role": "admin"
  },
  {
    "id": "10000000-0000-0000-0000-000000000004",
    "name": "الأخت ساندي عاطف",
    "phone": "01095507513",
    "role": "admin"
  },
  {
    "id": "10000000-0000-0000-0000-000000000005",
    "name": "الأخت هايدي إبراهيم",
    "phone": "01221883492",
    "role": "admin"
  },
  {
    "id": "10000000-0000-0000-0000-000000000006",
    "name": "الأخت برسيس زكي",
    "phone": "01221657634",
    "role": "admin"
  },
  {
    "id": "10000000-0000-0000-0000-000000000007",
    "name": "الأخت رينا أسامة",
    "phone": "01208515308",
    "role": "admin"
  }
];

export const INITIAL_YOUTH: Youth[] = [
  {
    "id": "20000000-0000-0000-0000-000000000001",
    "name": "استيفن عاطف",
    "phone": "01286316026",
    "school_year": "1st Prep",
    "assigned_servant_id": "10000000-0000-0000-0000-000000000003",
    "notes": ""
  },
  {
    "id": "20000000-0000-0000-0000-000000000002",
    "name": "بولس مجدي",
    "phone": "01225068415",
    "school_year": "3rd Prep",
    "assigned_servant_id": "10000000-0000-0000-0000-000000000003",
    "notes": ""
  },
  {
    "id": "20000000-0000-0000-0000-000000000003",
    "name": "جون امين",
    "phone": "01212282169",
    "school_year": "3rd Prep",
    "assigned_servant_id": "10000000-0000-0000-0000-000000000002",
    "notes": ""
  },
  {
    "id": "20000000-0000-0000-0000-000000000004",
    "name": "جوناثان صبحي",
    "phone": "01229600908",
    "school_year": "2nd Prep",
    "assigned_servant_id": "10000000-0000-0000-0000-000000000002",
    "notes": "الرقم المرفق هو رقم الام"
  },
  {
    "id": "20000000-0000-0000-0000-000000000005",
    "name": "شادي فهمي",
    "phone": "01281012964",
    "school_year": "3rd Prep",
    "assigned_servant_id": "10000000-0000-0000-0000-000000000001",
    "notes": "الرقم المرفق هو رقم الام"
  },
  {
    "id": "20000000-0000-0000-0000-000000000006",
    "name": "يوسف سعد",
    "phone": "01011598102",
    "school_year": "3rd Prep",
    "assigned_servant_id": "10000000-0000-0000-0000-000000000001",
    "notes": ""
  },
  {
    "id": "20000000-0000-0000-0000-000000000007",
    "name": "ماثيو نسيم",
    "phone": "01289821884",
    "school_year": "3rd Prep",
    "assigned_servant_id": "10000000-0000-0000-0000-000000000003",
    "notes": ""
  },
  {
    "id": "20000000-0000-0000-0000-000000000008",
    "name": "فلوباتير اشرف",
    "phone": "01003563268",
    "school_year": "2nd Prep",
    "assigned_servant_id": "10000000-0000-0000-0000-000000000002",
    "notes": ""
  },
  {
    "id": "20000000-0000-0000-0000-000000000009",
    "name": "بيتر ارميا",
    "phone": "01274839858",
    "school_year": "1st Prep",
    "assigned_servant_id": "10000000-0000-0000-0000-000000000002",
    "notes": ""
  },
  {
    "id": "20000000-0000-0000-0000-000000000010",
    "name": "مارتن سامح",
    "phone": "01283180065",
    "school_year": "2nd Prep",
    "assigned_servant_id": "10000000-0000-0000-0000-000000000002",
    "notes": ""
  },
  {
    "id": "20000000-0000-0000-0000-000000000011",
    "name": "نوفير اشرف",
    "phone": "01289531222",
    "school_year": "1st Prep",
    "assigned_servant_id": "10000000-0000-0000-0000-000000000001",
    "notes": ""
  },
  {
    "id": "20000000-0000-0000-0000-000000000012",
    "name": "جوليا معتز",
    "phone": "01227468200",
    "school_year": "2nd Prep",
    "assigned_servant_id": "10000000-0000-0000-0000-000000000004",
    "notes": ""
  },
  {
    "id": "20000000-0000-0000-0000-000000000013",
    "name": "ايمان جمال",
    "phone": "01289877665",
    "school_year": "3rd Prep",
    "assigned_servant_id": "10000000-0000-0000-0000-000000000005",
    "notes": "الرقم المرفق هو رقم الام"
  },
  {
    "id": "20000000-0000-0000-0000-000000000014",
    "name": "نانسي بطرس",
    "phone": "01280445840",
    "school_year": "2nd Prep",
    "assigned_servant_id": "10000000-0000-0000-0000-000000000006",
    "notes": ""
  },
  {
    "id": "20000000-0000-0000-0000-000000000015",
    "name": "جيمس اسحق",
    "phone": "01223256618",
    "school_year": "1st Prep",
    "assigned_servant_id": "10000000-0000-0000-0000-000000000003",
    "notes": ""
  },
  {
    "id": "20000000-0000-0000-0000-000000000016",
    "name": "اندي صابر",
    "phone": "01289498857",
    "school_year": "1st Prep",
    "assigned_servant_id": "10000000-0000-0000-0000-000000000001",
    "notes": ""
  },
  {
    "id": "20000000-0000-0000-0000-000000000017",
    "name": "ديفيد مجدي",
    "phone": "01226978225",
    "school_year": "1st Prep",
    "assigned_servant_id": "10000000-0000-0000-0000-000000000003",
    "notes": ""
  },
  {
    "id": "20000000-0000-0000-0000-000000000018",
    "name": "ايريني *",
    "phone": "",
    "school_year": "1st Prep",
    "assigned_servant_id": "10000000-0000-0000-0000-000000000004",
    "notes": "لا يوجد رقم"
  },
  {
    "id": "20000000-0000-0000-0000-000000000019",
    "name": "سارة يوحنا",
    "phone": "01281012973",
    "school_year": "2nd Prep",
    "assigned_servant_id": "10000000-0000-0000-0000-000000000007",
    "notes": ""
  },
  {
    "id": "20000000-0000-0000-0000-000000000020",
    "name": "كيرلس مودي",
    "phone": "01289432487",
    "school_year": "1st Prep",
    "assigned_servant_id": "10000000-0000-0000-0000-000000000001",
    "notes": ""
  },
  {
    "id": "20000000-0000-0000-0000-000000000021",
    "name": "كاترين سعد",
    "phone": "01012256351",
    "school_year": "2nd Prep",
    "assigned_servant_id": "10000000-0000-0000-0000-000000000007",
    "notes": ""
  },
  {
    "id": "20000000-0000-0000-0000-000000000022",
    "name": "لوجي مدحت",
    "phone": "01206418165",
    "school_year": "1st Prep",
    "assigned_servant_id": "10000000-0000-0000-0000-000000000004",
    "notes": ""
  },
  {
    "id": "20000000-0000-0000-0000-000000000023",
    "name": "كيرلس ثروت",
    "phone": "01206061674",
    "school_year": "1st Prep",
    "assigned_servant_id": "10000000-0000-0000-0000-000000000002",
    "notes": ""
  },
  {
    "id": "20000000-0000-0000-0000-000000000024",
    "name": "ايلاريا رأفت",
    "phone": "01275588639",
    "school_year": "1st Prep",
    "assigned_servant_id": "10000000-0000-0000-0000-000000000007",
    "notes": ""
  },
  {
    "id": "20000000-0000-0000-0000-000000000025",
    "name": "جوسي هاني",
    "phone": "01277773581",
    "school_year": "1st Prep",
    "assigned_servant_id": "10000000-0000-0000-0000-000000000006",
    "notes": ""
  },
  {
    "id": "20000000-0000-0000-0000-000000000026",
    "name": "جان هاني",
    "phone": "01277773581",
    "school_year": "1st Prep",
    "assigned_servant_id": "10000000-0000-0000-0000-000000000003",
    "notes": ""
  },
  {
    "id": "20000000-0000-0000-0000-000000000027",
    "name": "يوسف نبيل",
    "phone": "01040192393",
    "school_year": "1st Prep",
    "assigned_servant_id": "10000000-0000-0000-0000-000000000003",
    "notes": ""
  },
  {
    "id": "20000000-0000-0000-0000-000000000028",
    "name": "جوني ايهاب",
    "phone": "01281608940",
    "school_year": "1st Prep",
    "assigned_servant_id": "10000000-0000-0000-0000-000000000003",
    "notes": ""
  },
  {
    "id": "20000000-0000-0000-0000-000000000029",
    "name": "شنوده ياسر",
    "phone": "",
    "school_year": "1st Prep",
    "assigned_servant_id": "10000000-0000-0000-0000-000000000002",
    "notes": "لا يوجد رقم"
  },
  {
    "id": "20000000-0000-0000-0000-000000000030",
    "name": "كارن ياسر",
    "phone": "",
    "school_year": "1st Prep",
    "assigned_servant_id": "10000000-0000-0000-0000-000000000007",
    "notes": "لا يوجد رقم"
  },
  {
    "id": "20000000-0000-0000-0000-000000000031",
    "name": "ميراي رامي",
    "phone": "01203724988",
    "school_year": "3rd Prep",
    "assigned_servant_id": "10000000-0000-0000-0000-000000000005",
    "notes": ""
  },
  {
    "id": "20000000-0000-0000-0000-000000000032",
    "name": "دانيال نعيم",
    "phone": "",
    "school_year": "1st Prep",
    "assigned_servant_id": "10000000-0000-0000-0000-000000000002",
    "notes": "لا يوجد رقم"
  },
  {
    "id": "20000000-0000-0000-0000-000000000033",
    "name": "يوسف منير",
    "phone": "01214833775",
    "school_year": "1st Prep",
    "assigned_servant_id": "10000000-0000-0000-0000-000000000001",
    "notes": ""
  },
  {
    "id": "20000000-0000-0000-0000-000000000034",
    "name": "بولا",
    "phone": "",
    "school_year": "1st Prep",
    "assigned_servant_id": "10000000-0000-0000-0000-000000000003",
    "notes": "لا يوجد رقم"
  },
  {
    "id": "20000000-0000-0000-0000-000000000035",
    "name": "جومانه ماجد",
    "phone": "",
    "school_year": "1st Prep",
    "assigned_servant_id": "10000000-0000-0000-0000-000000000006",
    "notes": "لا يوجد رقم"
  },
  {
    "id": "20000000-0000-0000-0000-000000000036",
    "name": "جوليا ماجد",
    "phone": "",
    "school_year": "1st Prep",
    "assigned_servant_id": "10000000-0000-0000-0000-000000000005",
    "notes": ""
  },
  {
    "id": "20000000-0000-0000-0000-000000000037",
    "name": "روفينا سعد",
    "phone": "01271631238",
    "school_year": "1st Prep",
    "assigned_servant_id": "10000000-0000-0000-0000-000000000004",
    "notes": ""
  },
  {
    "id": "20000000-0000-0000-0000-000000000038",
    "name": "مارونيا صموئيل",
    "phone": "01200482038",
    "school_year": "1st Prep",
    "assigned_servant_id": "10000000-0000-0000-0000-000000000005",
    "notes": ""
  },
  {
    "id": "20000000-0000-0000-0000-000000000039",
    "name": "جونير ثروت",
    "phone": "01289159289",
    "school_year": "1st Prep",
    "assigned_servant_id": "10000000-0000-0000-0000-000000000006",
    "notes": ""
  },
  {
    "id": "20000000-0000-0000-0000-000000000040",
    "name": "بيير هاني",
    "phone": "01210684499",
    "school_year": "1st Prep",
    "assigned_servant_id": "10000000-0000-0000-0000-000000000001",
    "notes": ""
  },
  {
    "id": "20000000-0000-0000-0000-000000000041",
    "name": "شنودة",
    "phone": "",
    "school_year": "1st Prep",
    "assigned_servant_id": "10000000-0000-0000-0000-000000000001",
    "notes": "لا يوجد رقم"
  },
  {
    "id": "20000000-0000-0000-0000-000000000042",
    "name": "كيرلس قريب أميل",
    "phone": "01210049264",
    "school_year": "1st Prep",
    "assigned_servant_id": "10000000-0000-0000-0000-000000000002",
    "notes": "الرقم المرفق هو رقم الام"
  }
];

export const INITIAL_SCHEDULES: ServiceSchedule[] = [
  {
    "id": "30000000-0000-0000-0000-000000000101",
    "date": "2026-09-25",
    "speaker_servant_id": "10000000-0000-0000-0000-000000000001",
    "lesson_title": "المحبة الحقيقية وبناء الصداقات",
    "activity_notes": "مسابقة كتابية وفقرة ترانيم جماعية"
  },
  {
    "id": "30000000-0000-0000-0000-000000000102",
    "date": "2026-10-02",
    "speaker_servant_id": "10000000-0000-0000-0000-000000000003",
    "lesson_title": "كيف أتعامل مع ضغوط الدراسة والامتحانات؟",
    "activity_notes": "ورشة عمل وتوزيع هدايا التفوق"
  },
  {
    "id": "30000000-0000-0000-0000-000000000103",
    "date": "2026-10-09",
    "speaker_servant_id": "10000000-0000-0000-0000-000000000002",
    "lesson_title": "حياة الصلاة الشخصية وسر التوبة",
    "activity_notes": "صلاة جماعية وتأمل روحي"
  }
];

const FRIDAYS_12_WEEKS = [
  '2026-07-10',
  '2026-07-17',
  '2026-07-24',
  '2026-07-31',
  '2026-08-07',
  '2026-08-14',
  '2026-08-21',
  '2026-08-28',
  '2026-09-04',
  '2026-09-11',
  '2026-09-18',
  '2026-09-25',
];

function generate12WeekAttendance(): Attendance[] {
  const records: Attendance[] = [];
  const servantIds = INITIAL_SERVANTS.map((s) => s.id);

  INITIAL_YOUTH.forEach((y, yIdx) => {
    const youthNum = yIdx + 1;

    FRIDAYS_12_WEEKS.forEach((sessionDate, fIdx) => {
      const isLatestTwo = fIdx >= 10; // Sep 18, Sep 25
      const isEarlierSix = fIdx < 6;

      let status: AttendanceStatus = 'present';

      // Group A: Critical Dropout (Youth #5, #10, #22, #35) -> 3-4 consecutive absences
      if ([5, 10, 22, 35].includes(youthNum)) {
        if (fIdx >= 8) {
          // Missed last 4 sessions
          status = 'absent';
        } else if (fIdx === 7) {
          status = 'excused';
        } else {
          status = fIdx % 2 === 0 ? 'present' : 'absent';
        }
      }
      // Group B: Newcomer Risk (Youth #7, #28, #40) -> joined late August, attended 1-2, missed last 2
      else if ([7, 28, 40].includes(youthNum)) {
        if (fIdx < 7) {
          return; // not yet joined
        } else if (fIdx === 7 || fIdx === 8) {
          status = 'present';
        } else if (isLatestTwo) {
          status = 'absent';
        }
      }
      // Group C: Fading Regular (Youth #4, #15, #31) -> 100% in first 6 weeks, then <40% in last 6
      else if ([4, 15, 31].includes(youthNum)) {
        if (isEarlierSix) {
          status = 'present';
        } else {
          // In last 6 weeks, present only once
          status = fIdx === 8 ? 'present' : (fIdx === 10 ? 'excused' : 'absent');
        }
      }
      // Group D: Regular Active Attendees (High commitment: 85%-100%)
      else {
        const hash = (youthNum * 17 + fIdx * 31) % 100;
        if (hash < 82) {
          status = 'present';
        } else if (hash < 92) {
          status = 'excused';
        } else {
          status = 'absent';
        }
      }

      const recorderId = servantIds[(fIdx + youthNum) % servantIds.length];

      records.push({
        id: `att-${sessionDate}-${y.id.slice(-4)}`,
        youth_id: y.id,
        session_date: sessionDate,
        status,
        recorded_by: recorderId,
        created_at: `${sessionDate}T18:00:00.000Z`,
      });
    });
  });

  return records;
}

export const INITIAL_ATTENDANCE: Attendance[] = generate12WeekAttendance();

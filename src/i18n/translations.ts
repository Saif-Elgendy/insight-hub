export type Lang = 'ar' | 'en';

export const translations = {
  ar: {
    // Nav
    'nav.home': 'الرئيسية',
    'nav.courses': 'الكورسات',
    'nav.specialists': 'المختصين',
    'nav.library': 'المكتبة',
    'nav.consultations': 'الاستشارات',
    'nav.admin': 'إدارة النظام',
    'nav.dashboard': 'لوحة التحكم',
    'nav.consultantDashboard': 'لوحة الاستشاري',
    'nav.myConsultations': 'استشاراتي',
    'nav.account': 'حسابي',
    'nav.login': 'تسجيل الدخول',
    'nav.getStarted': 'ابدأ الآن',
    'nav.menu': 'القائمة',
    'lang.switch': 'تغيير اللغة',
    'lang.current': 'العربية',
    'lang.other': 'English',

    // Hero
    'hero.badge': 'منصة متخصصة في الصحة النفسية',
    'hero.title1': 'رحلتك نحو',
    'hero.title2': 'الصحة النفسية',
    'hero.title3': 'تبدأ من هنا',
    'hero.subtitle':
      'اكتشف كورسات متخصصة، جلسات مباشرة مع خبراء، واستشارات شخصية لمساعدتك في تحقيق التوازن النفسي والرفاهية',
    'hero.ctaCourses': 'استكشف الكورسات',
    'hero.ctaBook': 'احجز استشارتك',
    'hero.stat1': 'كورس متخصص',
    'hero.stat2': 'متدرب سعيد',
    'hero.stat3': 'خبير معتمد',
    'hero.stat4': 'رضا العملاء',

    // Courses section
    'courses.badge': 'الكورسات المسجلة',
    'courses.title': 'تعلم في أي وقت ومن أي مكان',
    'courses.subtitle': 'محتوى تعليمي غني ومتنوع يغطي جميع جوانب الصحة النفسية',
    'courses.defaultCategory': 'كورس',
    'courses.undefined': 'غير محدد',
    'courses.lessons': 'درس',
    'courses.start': 'ابدأ التعلم',
    'courses.viewAll': 'عرض جميع الكورسات',
    'courses.watch': 'مشاهدة',

    // Consultations section
    'cons.badge': 'استشارات فردية',
    'cons.title1': 'جلسة خاصة مع',
    'cons.title2': ' مختص ',
    'cons.title3': 'تناسب احتياجاتك',
    'cons.subtitle':
      'احصل على دعم شخصي من خبراء الصحة النفسية المعتمدين. جلسات خاصة ومخصصة لمساعدتك في التغلب على التحديات.',
    'cons.feature1': 'خصوصية تامة وسرية المعلومات',
    'cons.feature2': 'مختصين معتمدين ومرخصين',
    'cons.feature3': 'جدولة مرنة تناسب وقتك',
    'cons.feature4': 'متابعة مستمرة بعد الجلسة',
    'cons.readyCount': 'مختص جاهز لمساعدتك',
    'cons.guestTitle': 'سجّل الآن للوصول للمختصين',
    'cons.guestText': 'أنشئ حساباً مجانياً للتواصل مع المختصين المعتمدين وحجز جلساتك الخاصة.',
    'cons.guestCta': 'إنشاء حساب مجاني',
    'cons.videoTitle': 'جلسة فيديو',
    'cons.videoDesc': 'جلسة تفاعلية وجهاً لوجه عبر الفيديو',
    'cons.voiceTitle': 'مكالمة صوتية',
    'cons.voiceDesc': 'استشارة صوتية خاصة ومريحة',
    'cons.chatTitle': 'دردشة نصية',
    'cons.chatDesc': 'تواصل مكتوب مع المختص',
    'cons.minutes': 'دقيقة',
    'cons.currency': 'ج.م',
    'cons.bookNow': 'احجز الآن',
    'cons.signupToBook': 'سجّل للحجز',

    // Specialists section
    'spec.badge': 'فريق المختصين',
    'spec.title1': 'تعرّف على',
    'spec.title2': ' مختصينا ',
    'spec.title3': 'المعتمدين',
    'spec.subtitle': 'نخبة من الأطباء والمعالجين النفسيين المرخصين والمعتمدين، جاهزون لمساعدتك',
    'spec.years': 'سنوات خبرة',
    'spec.viewAll': 'عرض جميع المختصين',

    // Testimonials
    'test.badge': 'آراء المتدربين',
    'test.title': 'ماذا يقول عملاؤنا؟',
    'test.subtitle': 'نفتخر بثقة أكثر من 1000 متدرب اختاروا منصتنا لرحلتهم نحو الصحة النفسية',
    'test.1.name': 'أحمد محمد',
    'test.1.role': 'موظف قطاع خاص',
    'test.1.content':
      'كورس إدارة القلق غيّر حياتي بشكل كامل. تعلمت تقنيات عملية أستخدمها يومياً في التعامل مع ضغوط العمل.',
    'test.2.name': 'نورة العلي',
    'test.2.role': 'طالبة جامعية',
    'test.2.content':
      'الجلسات المباشرة مع الدكتورة سارة كانت مفيدة جداً. أشعر بتحسن كبير في ثقتي بنفسي وقدرتي على التعبير عن مشاعري.',
    'test.3.name': 'خالد السالم',
    'test.3.role': 'رائد أعمال',
    'test.3.content':
      'المنصة سهلة الاستخدام والمحتوى عالي الجودة. الاستشارات الفردية ساعدتني في تحقيق التوازن بين العمل والحياة.',

    // CTA
    'cta.badge': 'ابدأ رحلتك اليوم',
    'cta.title': 'جاهز لتبدأ رحلتك نحو حياة أفضل؟',
    'cta.subtitle':
      'انضم لآلاف المتدربين الذين غيّروا حياتهم من خلال منصتنا. أول خطوة نحو التغيير تبدأ الآن.',
    'cta.primary': 'سجّل مجاناً الآن',
    'cta.secondary': 'تواصل معنا',

    // Footer
    'footer.tagline':
      'منصة متخصصة في الصحة النفسية تقدم كورسات، جلسات مباشرة، واستشارات فردية مع أفضل المختصين.',
    'footer.platform': 'المنصة',
    'footer.support': 'الدعم',
    'footer.company': 'الشركة',
    'footer.certificates': 'الشهادات',
    'footer.helpCenter': 'مركز المساعدة',
    'footer.faq': 'الأسئلة الشائعة',
    'footer.contact': 'تواصل معنا',
    'footer.privacy': 'سياسة الخصوصية',
    'footer.about': 'من نحن',
    'footer.team': 'فريق العمل',
    'footer.careers': 'وظائف',
    'footer.partners': 'الشراكات',
    'footer.location': 'مصر، طنطا',
    'footer.rights': '© 2024 نفسي. جميع الحقوق محفوظة.',

    // Brand
    'brand.name': 'نفسي',
  },
  en: {
    'nav.home': 'Home',
    'nav.courses': 'Courses',
    'nav.specialists': 'Specialists',
    'nav.library': 'Library',
    'nav.consultations': 'Consultations',
    'nav.admin': 'Administration',
    'nav.dashboard': 'Dashboard',
    'nav.consultantDashboard': 'Consultant Panel',
    'nav.myConsultations': 'My Consultations',
    'nav.account': 'My Account',
    'nav.login': 'Sign In',
    'nav.getStarted': 'Get Started',
    'nav.menu': 'Menu',
    'lang.switch': 'Change language',
    'lang.current': 'English',
    'lang.other': 'العربية',

    'hero.badge': 'A platform dedicated to mental health',
    'hero.title1': 'Your journey to',
    'hero.title2': 'mental wellbeing',
    'hero.title3': 'starts here',
    'hero.subtitle':
      'Discover specialized courses, live sessions with experts, and personal consultations to help you find balance and wellbeing.',
    'hero.ctaCourses': 'Explore Courses',
    'hero.ctaBook': 'Book a Consultation',
    'hero.stat1': 'Specialized courses',
    'hero.stat2': 'Happy learners',
    'hero.stat3': 'Certified experts',
    'hero.stat4': 'Client satisfaction',

    'courses.badge': 'Recorded courses',
    'courses.title': 'Learn anytime, anywhere',
    'courses.subtitle': 'Rich, varied educational content covering every aspect of mental health',
    'courses.defaultCategory': 'Course',
    'courses.undefined': 'Not specified',
    'courses.lessons': 'lessons',
    'courses.start': 'Start Learning',
    'courses.viewAll': 'View all courses',
    'courses.watch': 'Watch',

    'cons.badge': 'One-on-one consultations',
    'cons.title1': 'A private session with a',
    'cons.title2': ' specialist ',
    'cons.title3': 'tailored to your needs',
    'cons.subtitle':
      'Get personal support from certified mental-health experts. Private sessions designed to help you overcome your challenges.',
    'cons.feature1': 'Complete privacy and confidentiality',
    'cons.feature2': 'Certified and licensed specialists',
    'cons.feature3': 'Flexible scheduling that fits your time',
    'cons.feature4': 'Ongoing follow-up after the session',
    'cons.readyCount': 'specialists ready to help you',
    'cons.guestTitle': 'Sign up to reach our specialists',
    'cons.guestText':
      'Create a free account to connect with certified specialists and book your private sessions.',
    'cons.guestCta': 'Create a free account',
    'cons.videoTitle': 'Video session',
    'cons.videoDesc': 'An interactive face-to-face session over video',
    'cons.voiceTitle': 'Voice call',
    'cons.voiceDesc': 'A private, comfortable voice consultation',
    'cons.chatTitle': 'Text chat',
    'cons.chatDesc': 'Written conversation with your specialist',
    'cons.minutes': 'minutes',
    'cons.currency': 'EGP',
    'cons.bookNow': 'Book now',
    'cons.signupToBook': 'Sign up to book',

    'spec.badge': 'Our specialists',
    'spec.title1': 'Meet our',
    'spec.title2': ' certified ',
    'spec.title3': 'specialists',
    'spec.subtitle':
      'A select team of licensed and certified psychiatrists and therapists, ready to support you',
    'spec.years': 'years of experience',
    'spec.viewAll': 'View all specialists',

    'test.badge': 'Learner reviews',
    'test.title': 'What our clients say',
    'test.subtitle':
      'We are proud of the trust of more than 1,000 learners who chose our platform for their mental-health journey',
    'test.1.name': 'Ahmed Mohamed',
    'test.1.role': 'Private sector employee',
    'test.1.content':
      'The anxiety management course completely changed my life. I learned practical techniques I use daily to handle work pressure.',
    'test.2.name': 'Noura Al-Ali',
    'test.2.role': 'University student',
    'test.2.content':
      'The live sessions with Dr. Sarah were very helpful. I feel much more confident and able to express my feelings.',
    'test.3.name': 'Khaled Al-Salem',
    'test.3.role': 'Entrepreneur',
    'test.3.content':
      'The platform is easy to use and the content is high quality. The one-on-one consultations helped me balance work and life.',

    'cta.badge': 'Start your journey today',
    'cta.title': 'Ready to start your journey to a better life?',
    'cta.subtitle':
      'Join thousands of learners who transformed their lives through our platform. The first step starts now.',
    'cta.primary': 'Sign up free now',
    'cta.secondary': 'Contact us',

    'footer.tagline':
      'A platform dedicated to mental health, offering courses, live sessions, and one-on-one consultations with top specialists.',
    'footer.platform': 'Platform',
    'footer.support': 'Support',
    'footer.company': 'Company',
    'footer.certificates': 'Certificates',
    'footer.helpCenter': 'Help center',
    'footer.faq': 'FAQ',
    'footer.contact': 'Contact us',
    'footer.privacy': 'Privacy policy',
    'footer.about': 'About us',
    'footer.team': 'Our team',
    'footer.careers': 'Careers',
    'footer.partners': 'Partnerships',
    'footer.location': 'Tanta, Egypt',
    'footer.rights': '© 2024 Nafsi. All rights reserved.',

    'brand.name': 'Nafsi',
  },
} as const;

export type TranslationKey = keyof typeof translations.ar;

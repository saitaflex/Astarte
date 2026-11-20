import type { Locale } from "./config";

const en = {
  email: "Email", password: "Password", passwordHint: "At least 8 characters.", name: "Your name", signIn: "Sign in",
  noAccount: "New to Astarte?", createAccount: "Create an account", consent: "I accept the", terms: "Terms", privacy: "Privacy notice",
  stepWork: "Your work", stepAccount: "Your account", artistName: "Artist or studio name", artistNameHint: "This is the name customers will see.",
  discipline: "Main discipline", city: "City", locationShown: "How your location appears", showCity: "City only (recommended)",
  showArea: "Area I work in", showHidden: "Hidden", bio: "About your work (optional)", bioHint: "What you make, how, and what makes it yours. You can finish this later.",
  continue: "Continue", back: "Back", createArtist: "Create my artist profile",
  reviewNote: "Your profile becomes public after a quick review by our team. You can add works and photos right away.",
  signInTitle: "Welcome back", signUpTitle: "Create your account", signUpLead: "Save artists, order work and earn Point Merci.",
  joinTitle: "Join Astarte as an artist", joinLead: "Show your work to people looking for exactly what you make. Free to join.",
  joinPoints: "Your own portfolio page|Sell in the marketplace|Customers find you through AI search and the map|Guidance through Grow with Astarte",
  alreadyArtist: "Already have an account?",
};
type Labels = typeof en;

const fr: Labels = {
  email: "E-mail", password: "Mot de passe", passwordHint: "Au moins 8 caractères.", name: "Votre nom", signIn: "Connexion",
  noAccount: "Nouveau sur Astarte ?", createAccount: "Créer un compte", consent: "J'accepte les", terms: "Conditions", privacy: "Avis de confidentialité",
  stepWork: "Votre travail", stepAccount: "Votre compte", artistName: "Nom d'artiste ou d'atelier", artistNameHint: "C'est le nom que verront les clients.",
  discipline: "Discipline principale", city: "Ville", locationShown: "Affichage de votre localisation", showCity: "Ville uniquement (recommandé)",
  showArea: "Zone où je travaille", showHidden: "Masquée", bio: "À propos de votre travail (facultatif)", bioHint: "Ce que vous créez, comment, et ce qui le rend unique. Vous pourrez compléter plus tard.",
  continue: "Continuer", back: "Retour", createArtist: "Créer mon profil d'artiste",
  reviewNote: "Votre profil devient public après une courte vérification par notre équipe. Vous pouvez ajouter des œuvres et des photos dès maintenant.",
  signInTitle: "Bon retour", signUpTitle: "Créer votre compte", signUpLead: "Enregistrez des artistes, commandez et gagnez des Point Merci.",
  joinTitle: "Rejoindre Astarte en tant qu'artiste", joinLead: "Montrez votre travail aux personnes qui cherchent exactement ce que vous faites. Inscription gratuite.",
  joinPoints: "Votre propre page portfolio|Vendez sur la marketplace|Les clients vous trouvent via la recherche IA et la carte|Un accompagnement avec Grandir avec Astarte",
  alreadyArtist: "Vous avez déjà un compte ?",
};

const ar: Labels = {
  email: "البريد الإلكتروني", password: "كلمة المرور", passwordHint: "8 أحرف على الأقل.", name: "اسمك", signIn: "تسجيل الدخول",
  noAccount: "جديد على Astarte؟", createAccount: "إنشاء حساب", consent: "أوافق على", terms: "الشروط", privacy: "إشعار الخصوصية",
  stepWork: "عملك", stepAccount: "حسابك", artistName: "اسم الفنان أو الورشة", artistNameHint: "هذا هو الاسم الذي سيراه العملاء.",
  discipline: "التخصص الرئيسي", city: "المدينة", locationShown: "كيف يظهر موقعك", showCity: "المدينة فقط (مستحسن)",
  showArea: "المنطقة التي أعمل فيها", showHidden: "مخفي", bio: "عن عملك (اختياري)", bioHint: "ماذا تصنع وكيف وما الذي يميّزه. يمكنك إكماله لاحقًا.",
  continue: "متابعة", back: "رجوع", createArtist: "أنشئ ملفي الفني",
  reviewNote: "يصبح ملفك عامًا بعد مراجعة سريعة من فريقنا. يمكنك إضافة الأعمال والصور فورًا.",
  signInTitle: "مرحبًا بعودتك", signUpTitle: "أنشئ حسابك", signUpLead: "احفظ الفنانين واطلب الأعمال واكسب نقاط ميرسي.",
  joinTitle: "انضم إلى Astarte كفنان", joinLead: "اعرض أعمالك على من يبحث عمّا تصنعه بالضبط. التسجيل مجاني.",
  joinPoints: "صفحة أعمال خاصة بك|بِع في السوق|يجدك العملاء عبر البحث الذكي والخريطة|مرافقة عبر برنامج انمُ مع Astarte",
  alreadyArtist: "لديك حساب بالفعل؟",
};

export function authLabels(locale: Locale): Labels {
  return { en, fr, ar }[locale];
}

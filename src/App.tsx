import { useState, useRef, useEffect } from "react";
const canGrantsLogo = "/cangrants-logo.png";

const CA_PROVINCES = [
  "Alberta","British Columbia","Manitoba","New Brunswick",
  "Newfoundland and Labrador","Northwest Territories","Nova Scotia",
  "Nunavut","Ontario","Prince Edward Island","Quebec",
  "Saskatchewan","Yukon"
];

const GRANTS = [
  { id:1, name:"Talent to Watch", org:"Telefilm Canada", open:"2026-01-15", close:"2026-04-30", url:"https://telefilm.ca/en/funding/talent-to-watch", discipline:["Film"], location:"Canada", amount:"Up to $125,000", tags:["Emerging","First Feature","Diverse Producers"], eligibility:"Canadian first- or second-time feature film producers. At least one key creative must be a first-timer. Strong preference for projects from underrepresented communities.", description:"Supports first and second feature film productions by emerging Canadian producers." },
  { id:2, name:"Development Program", org:"Telefilm Canada", open:"2026-01-01", close:"Rolling", url:"https://telefilm.ca/en/funding/development", discipline:["Film"], location:"Canada", amount:"Up to $60,000", tags:["Development","Screenwriting","Producers"], eligibility:"Canadian production companies with a development track record. Project must be a feature film targeting theatrical release.", description:"Funds development of Canadian feature film projects including script development and packaging." },
  { id:3, name:"Explore and Create", org:"Canada Council for the Arts", open:"2026-02-01", close:"2026-05-15", url:"https://canadacouncil.ca/funding/grants/explore-and-create", discipline:["Film","Visual Arts","Music","Writing","Interdisciplinary"], location:"Canada", amount:"Varies", tags:["Individual Artists","Groups","Emerging","Mid-Career","Diverse"], eligibility:"Canadian citizens or permanent residents who are professional artists, groups, or arts organizations. Supports research, development, creation, and production of artistic work.", description:"Supports the research, development, creation and production of artistic work across all disciplines." },
  { id:4, name:"Engage and Sustain", org:"Canada Council for the Arts", open:"2026-03-01", close:"2026-06-01", url:"https://canadacouncil.ca/funding/grants/engage-and-sustain", discipline:["Film","Visual Arts","Music","Writing","Interdisciplinary"], location:"Canada", amount:"Varies", tags:["Organizations","Sustainability","Community"], eligibility:"Canadian arts organizations at the heart of creative communities. Supports ongoing operations and programming of established arts entities.", description:"Supports arts organizations at the heart of creative communities across Canada." },
  { id:31, name:"Creating, Knowing and Sharing", org:"Canada Council for the Arts", open:"2026-02-15", close:"2026-06-15", url:"https://canadacouncil.ca/funding/grants/creating-knowing-sharing", discipline:["Film","Visual Arts","Music","Writing","Interdisciplinary"], location:"Canada", amount:"Varies", tags:["Indigenous","First Nations","Inuit","M\u00e9tis","Individual Artists","Organizations"], eligibility:"Individuals, groups, Indigenous-led arts organizations and arts and cultural sector development organizations. Supports a vital and resilient Indigenous arts ecosystem.", description:"Supports First Nations, Inuit and M\u00e9tis individuals, groups and organizations that foster a vital and resilient Indigenous arts ecosystem." },
  { id:32, name:"Supporting Artistic Practice", org:"Canada Council for the Arts", open:"2026-03-01", close:"2026-07-01", url:"https://canadacouncil.ca/funding/grants/supporting-artistic-practice", discipline:["Film","Visual Arts","Music","Writing","Interdisciplinary"], location:"Canada", amount:"Varies", tags:["Organizations","Groups","Capacity Building","Sector Development"], eligibility:"Canadian arts professionals, groups and arts organizations who champion the Canadian arts sector. Supports boosting capacity for artists to realize work and advance conditions of creation.", description:"Supports Canadian arts professionals, groups and organizations who champion the arts sector and boost capacity for artists." },
  { id:33, name:"Arts Across Canada and Abroad", org:"Canada Council for the Arts", open:"2026-04-01", close:"2026-08-01", url:"https://canadacouncil.ca/funding/grants/arts-across-canada-and-abroad", discipline:["Film","Visual Arts","Music","Writing","Interdisciplinary"], location:"Canada", amount:"Varies", tags:["Touring","International","Sharing","Distribution","Individual Artists","Organizations"], eligibility:"Canadian artists sharing their work nationally and internationally. Supports touring, distribution, dissemination and sharing of artistic work.", description:"Supports Canadian artists in sharing their work both nationally and internationally." },
  { id:5, name:"Ontario Creates IP Fund", org:"Ontario Creates", open:"2026-01-10", close:"2026-05-31", url:"https://www.ontariocreates.ca/investment-programs/content-creation/intellectual-property-fund", discipline:["Film","Television"], location:"Canada", amount:"$50,000\u2013$1,000,000", tags:["Ontario","Feature Film","TV Series","Producers","IP"], eligibility:"Ontario-based production companies. Content must be produced substantially in Ontario with significant Ontario expenditure.", description:"Funds Ontario-based film and television productions with a focus on intellectual property development and market reach." },
  { id:6, name:"IDM Fund", org:"Ontario Creates", open:"2026-02-15", close:"Rolling", url:"https://www.ontariocreates.ca/investment-programs/content-creation/idm-fund-2", discipline:["Digital Media","Interactive"], location:"Canada", amount:"Varies", tags:["Ontario","Digital","Interactive","Innovation"], eligibility:"Ontario-based companies creating interactive digital media content. Projects must demonstrate market potential and innovation.", description:"Supports Ontario interactive digital media projects with strong commercial and creative potential." },
  { id:7, name:"Media Artists Program \u2013 Creation", org:"Toronto Arts Council", open:"2026-01-01", close:"2026-10-15", url:"https://torontoartscouncil.org/grants/media-artists-program-creation/", discipline:["Film","Digital Media"], location:"Canada", amount:"Up to $15,000", tags:["Toronto","Individual Artists","Media Arts","Emerging","Diverse"], eligibility:"Toronto-based media artists with a professional independent art practice. Includes independent film, video, audio, digital, VR/AR and new media artworks. TAC prioritizes equity-deserving groups.", description:"Supports Toronto media artists for creation/production of new work or completion of works in progress in film, video, digital and new media." },
  { id:8, name:"Dance Projects", org:"Toronto Arts Council", open:"2026-01-01", close:"2026-03-16", url:"https://torontoartscouncil.org/grants/dance-projects/", discipline:["Dance"], location:"Canada", amount:"Varies", tags:["Toronto","Dance","Individual Artists","Organizations","Collectives"], eligibility:"Toronto-based dance artists, organizations and collectives. TAC prioritizes equity-deserving groups in all funding decisions.", description:"Supports professional development, creation, production and presentation of dance in Toronto." },
  { id:36, name:"Theatre Projects", org:"Toronto Arts Council", open:"2026-01-01", close:"2026-03-02", url:"https://torontoartscouncil.org/grants/theatre-projects/", discipline:["Theatre"], location:"Canada", amount:"Varies", tags:["Toronto","Theatre","Organizations","Collectives"], eligibility:"Toronto-based theatre organizations and collectives. TAC prioritizes equity-deserving groups in all funding decisions.", description:"Supports the creation, production and presentation of theatre works in Toronto." },
  { id:37, name:"Playwrights Program", org:"Toronto Arts Council", open:"2026-01-01", close:"2026-06-16", url:"https://torontoartscouncil.org/grants/playwrights-program/", discipline:["Theatre","Writing"], location:"Canada", amount:"Varies", tags:["Toronto","Theatre","Individual Artists","Playwrights","Writing"], eligibility:"Toronto-based individual playwrights. TAC prioritizes equity-deserving groups in all funding decisions.", description:"Supports the creation of theatrical plays by Toronto-based playwrights." },
  { id:38, name:"Music Projects", org:"Toronto Arts Council", open:"2026-01-01", close:"2026-03-16", url:"https://torontoartscouncil.org/grants/music-projects/", discipline:["Music"], location:"Canada", amount:"Varies", tags:["Toronto","Music","Organizations","Collectives","Presentation"], eligibility:"Toronto-based music organizations and collectives. TAC prioritizes equity-deserving groups in all funding decisions.", description:"Supports music projects involving production, presentation, dissemination and other activities in Toronto." },
  { id:39, name:"Music Creation & Recording", org:"Toronto Arts Council", open:"2026-01-01", close:"2026-09-03", url:"https://torontoartscouncil.org/grants/music-creation-and-recording/", discipline:["Music"], location:"Canada", amount:"Varies", tags:["Toronto","Music","Individual Artists","Creation","Recording"], eligibility:"Toronto-based artists working in any genre for the creation, writing and production of original music. TAC prioritizes equity-deserving groups.", description:"Supports Toronto artists in the creation, writing and production of their original music across all genres." },
  { id:40, name:"Visual Artists Program \u2013 Creation", org:"Toronto Arts Council", open:"2026-01-01", close:"Rolling", url:"https://torontoartscouncil.org/grants/visual-artists-program-creation/", discipline:["Visual Arts"], location:"Canada", amount:"$10,000", tags:["Toronto","Visual Arts","Individual Artists","Creation"], eligibility:"Toronto-based visual artists with a professional independent art practice. Includes drawing, painting, sculpture, photography, mixed media, printmaking, performance art, installation and fine crafts.", description:"Supports Toronto visual artists for creation/production of new work or completion of works in progress." },
  { id:41, name:"Writers Program", org:"Toronto Arts Council", open:"2026-01-01", close:"2026-06-15", url:"https://torontoartscouncil.org/grants/writers-program/", discipline:["Writing"], location:"Canada", amount:"Varies", tags:["Toronto","Writing","Individual Artists","Literary","Creation"], eligibility:"Toronto-based writers creating new literary works in written and oral forms across diverse genres. TAC prioritizes equity-deserving groups.", description:"Supports the creation of new literary works in written and oral forms across diverse genres by Toronto-based writers." },
  { id:42, name:"Literary Projects", org:"Toronto Arts Council", open:"2026-01-01", close:"Rolling", url:"https://torontoartscouncil.org/grants/literary-projects/", discipline:["Writing"], location:"Canada", amount:"Varies", tags:["Toronto","Literary","Organizations","Collectives","Presentation"], eligibility:"Toronto-based literary organizations and collectives. Supports spoken word events, reading series, festivals, conferences and more.", description:"Supports literary projects including spoken word events, reading series, festivals, conferences and more in Toronto." },
  { id:9, name:"Convergent Stream \u2013 Development", org:"Canada Media Fund (CMF)", open:"2026-01-06", close:"2026-04-08", url:"https://cmf-fmc.ca/our-programs/", discipline:["Television","Digital Media"], location:"Canada", amount:"Up to $350,000", tags:["Broadcasters","Producers","Television","Digital"], eligibility:"Canadian independent producers with a broadcaster license agreement. Projects must be linear television content with an interactive digital component.", description:"Funds development of Canadian television programs with convergent digital media components." },
  { id:10, name:"Experimental Stream", org:"Canada Media Fund (CMF)", open:"2026-02-01", close:"2026-05-01", url:"https://cmf-fmc.ca/our-programs/", discipline:["Digital Media","Interactive"], location:"Canada", amount:"Up to $750,000", tags:["Innovation","Interactive","Digital","Diverse Producers"], eligibility:"Canadian companies creating innovative digital media content and applications. Projects must demonstrate market reach and commercial viability.", description:"Funds innovative Canadian digital media and interactive projects with strong market potential." },
  { id:11, name:"Bell Fund \u2013 Digital Media", org:"Bell Fund", open:"2026-03-01", close:"2026-06-30", url:"https://bellfund.ca/deadlines/", discipline:["Digital Media","Television"], location:"Canada", amount:"Up to $300,000", tags:["Digital","Broadcasters","Producers","Interactive"], eligibility:"Canadian producers with a broadcast license. Projects must be convergent media tied to a Canadian television broadcast.", description:"Supports Canadian digital media projects that complement television content on Canadian broadcast platforms." },
  { id:12, name:"Producers Program", org:"Independent Production Fund (IPF)", open:"2026-01-20", close:"2026-04-20", url:"https://www.ipf.ca/", discipline:["Television","Digital Media"], location:"Canada", amount:"Up to $150,000", tags:["Producers","Television","Independent","Diverse"], eligibility:"Canadian independent producers creating Canadian television content. Emerging producers and diverse voices given priority.", description:"Funds Canadian independent television and digital media production with focus on emerging and diverse producers." },
  { id:13, name:"LIFT Production Grant", org:"Liaison of Independent Filmmakers of Toronto", open:"2026-02-01", close:"2026-05-01", url:"https://lift.ca/", discipline:["Film","Digital Media"], location:"Canada", amount:"$2,000\u2013$10,000", tags:["Toronto","Independent","Emerging","BIPOC","Experimental"], eligibility:"LIFT members based in Toronto. Priority for emerging and underrepresented filmmakers including BIPOC and LGBTQ+ artists.", description:"Supports Toronto independent filmmakers with production funding for short and feature-length projects." },
  { id:14, name:"Alberta Made Production Grant", org:"Government of Alberta", open:"2026-01-01", close:"Rolling", url:"https://www.alberta.ca/alberta-made-production-grant", discipline:["Film","Television"], location:"Canada", amount:"Varies", tags:["Alberta","Film","Television","Production"], eligibility:"Alberta-based productions. Both Canadian and international productions eligible with significant Alberta expenditure.", description:"Supports film and television productions in Alberta with production-stage funding." },
  { id:34, name:"Alberta Project Script Development Grant", org:"Government of Alberta", open:"2026-01-01", close:"Rolling", url:"https://www.alberta.ca/alberta-project-script-development-grant", discipline:["Film","Television"], location:"Canada", amount:"Varies", tags:["Alberta","Screenwriting","Development","Emerging"], eligibility:"Alberta-based screenwriters and producers developing scripts for film or television projects.", description:"Funds script development for Alberta-based film and television projects." },
  { id:35, name:"AMF Post Production Grant", org:"Government of Alberta", open:"2026-01-01", close:"Rolling", url:"https://www.alberta.ca/alberta-project-script-development-grant", discipline:["Film","Television"], location:"Canada", amount:"Varies", tags:["Alberta","Post Production","Film","Television"], eligibility:"Productions completing post-production in Alberta. Must demonstrate significant Alberta post-production expenditure.", description:"Supports post-production work on film and television projects completed in Alberta." },
  { id:15, name:"Film, Sound & Music Grant", org:"Creative BC", open:"2026-02-01", close:"2026-06-15", url:"https://www.creativebc.com/", discipline:["Film","Music"], location:"Canada", amount:"$5,000\u2013$150,000", tags:["BC","Film","Music","Emerging","Diverse"], eligibility:"BC-based artists and production companies. Priority for projects with strong BC cultural content and diverse creative teams.", description:"Supports BC-based film and music projects from development through distribution." },
  { id:16, name:"Manitoba Film & TV Funding Programs", org:"Manitoba Film & Music", open:"2026-01-15", close:"Rolling", url:"https://www.mbfilmmusic.ca/film-tv/film-tv-funding-programs", discipline:["Film","Television","Music"], location:"Canada", amount:"Up to $200,000", tags:["Manitoba","Film","Television","Music","Independent"], eligibility:"Manitoba-based production companies with a minimum Manitoba spend. Projects must demonstrate strong market potential.", description:"Funds Manitoba film, television and music productions with market-driven content mandates." },
  { id:17, name:"Filmmaker Assistance Program (FAP)", org:"National Film Board of Canada (NFB)", open:"2026-03-15", close:"2026-07-01", url:"https://production.nfbonf.ca/en/filmmaker-assistance-program-fap/", discipline:["Documentary","Film"], location:"Canada", amount:"Co-production funding", tags:["Documentary","Diverse","Indigenous","Social Issues","Environment"], eligibility:"Canadian filmmakers with compelling documentary or film projects. NFB prioritizes Indigenous creators, gender parity, and perspectives from underrepresented communities.", description:"NFB co-produces films with Canadian filmmakers exploring social, cultural, and environmental themes through the Filmmaker Assistance Program." },
  { id:18, name:"Saskatchewan Arts Board Project Grant", org:"Saskatchewan Arts Board", open:"2026-02-15", close:"2026-05-15", url:"https://sk-arts.ca/", discipline:["Film","Visual Arts","Music","Writing","Interdisciplinary"], location:"Canada", amount:"$3,000\u2013$25,000", tags:["Saskatchewan","Individual Artists","Emerging","Diverse"], eligibility:"Saskatchewan residents who are professional artists. Funds projects at any stage of development or production.", description:"Supports Saskatchewan artists in creating and sharing their work across all disciplines." },
  { id:19, name:"Project Involve Fellowship", org:"Film Independent", open:"2026-08-01", close:"2026-10-01", url:"https://www.filmindependent.org/programs/project-involve/", discipline:["Film"], location:"International", amount:"Fellowship + Mentorship", tags:["Emerging","BIPOC","Diaspora","Underrepresented","Hollywood"], eligibility:"Emerging filmmakers from underrepresented communities. Open to international applicants including Canadians. Strong preference for BIPOC, women, LGBTQ+, and disability communities.", description:"Year-long fellowship for emerging filmmakers from underrepresented communities, including mentorship and a short film production grant." },
  { id:20, name:"Sundance Feature Film Program", org:"Sundance Institute", open:"2026-04-01", close:"2026-07-01", url:"https://collab.sundance.org/", discipline:["Film"], location:"International", amount:"Lab support + mentorship", tags:["Emerging","Independent","Feature Film","Diverse","Diaspora"], eligibility:"Independent filmmakers worldwide developing their first or second feature. Projects must demonstrate strong narrative ambition and originality.", description:"Intensive lab and mentorship program supporting emerging feature filmmakers globally, including Canadian and South Asian diaspora artists." },
  { id:21, name:"Sundance Documentary Fund", org:"Sundance Institute", open:"2026-03-01", close:"2026-06-01", url:"https://www.sundance.org/apply", discipline:["Documentary"], location:"International", amount:"$10,000\u2013$50,000", tags:["Documentary","Emerging","Diverse","International","Social Issues"], eligibility:"Documentary filmmakers worldwide with projects in development or production. Priority for underrepresented voices and urgent social themes.", description:"Funds documentary films from global filmmakers exploring urgent human stories and social issues." },
  { id:22, name:"Berlinale Talents", org:"Berlin International Film Festival", open:"2026-09-01", close:"2026-11-01", url:"https://www.berlinale-talents.de/", discipline:["Film"], location:"International", amount:"Residency + Networking", tags:["Emerging","International","Directors","Producers","Writers"], eligibility:"Film professionals within first 10 years of career. Open globally including Canada. All departments eligible: directors, producers, screenwriters, editors, composers.", description:"Annual talent development program bringing 200+ emerging film professionals to Berlin for mentorship, workshops, and networking." },
  { id:23, name:"TIFF Talent Lab", org:"Toronto International Film Festival", open:"2026-03-01", close:"2026-05-31", url:"https://tiff.net/themarket/programming/labs-learning", discipline:["Film"], location:"International", amount:"Lab + mentorship", tags:["Emerging","Canadian Priority","Directors","Producers","Diaspora"], eligibility:"Emerging Canadian and international filmmakers with projects in development. Canadian applicants given priority. Strong preference for underrepresented voices.", description:"Intensive development lab at TIFF supporting emerging filmmakers with access to industry mentors and international co-production opportunities." },
  { id:24, name:"Locarno Filmmakers Academy", org:"Locarno Film Festival", open:"2026-04-01", close:"2026-06-01", url:"https://www.locarnofestival.ch/about/factory.html", discipline:["Film"], location:"International", amount:"Residency + Networking", tags:["Emerging","Directors","International","Art Cinema"], eligibility:"Emerging directors with at least one feature film. International applications accepted. Strong preference for auteur-driven, art cinema projects.", description:"Residency program at Locarno Film Festival connecting emerging directors with leading industry figures and development support." },
  { id:25, name:"IDFA Forum \u2013 DocLab", org:"International Documentary Film Festival Amsterdam", open:"2026-05-01", close:"2026-08-01", url:"https://festival.idfa.nl/en/new-media/", discipline:["Documentary","Digital Media","Interactive"], location:"International", amount:"Forum support + pitch platform", tags:["Documentary","Interactive","Innovation","International","Diverse"], eligibility:"Documentary and interactive media projects globally. Work must be in advanced development or post-production. Strong preference for innovative storytelling formats.", description:"International co-financing and co-production forum for documentary projects, including interactive and digital storytelling work." },
  { id:26, name:"TorinoFilmLab \u2013 Script & Pitch", org:"Torino Film Lab", open:"2026-02-01", close:"2026-04-15", url:"https://www.torinofilmlab.it/labs", discipline:["Film"], location:"International", amount:"Development support + prize funding", tags:["Emerging","Writers","Directors","International","Diaspora"], eligibility:"International filmmakers working on first or second feature. Priority for projects from underrepresented territories and filmmakers with diaspora perspectives.", description:"Year-long script and pitch development lab supporting emerging international filmmakers with mentorship and industry access." },
  { id:27, name:"IFFR Bright Future", org:"International Film Festival Rotterdam", open:"2026-06-01", close:"2026-09-01", url:"https://iffr.com/en/iffr-pro/talent-development", discipline:["Film"], location:"International", amount:"Residency + development support", tags:["Emerging","International","Experimental","Art Cinema","Diaspora"], eligibility:"Emerging filmmakers worldwide with bold, innovative projects. IFFR particularly welcomes filmmakers from the global south and diaspora communities.", description:"Talent development program at IFFR supporting emerging directors with innovative and experimental approaches to cinema." },
  { id:28, name:"MAC Matchmaker MicroGrant", org:"Mississauga Arts Council", open:"2026-01-01", close:"Rolling", url:"https://www.mississaugaartscouncil.com/", discipline:["Film","Visual Arts","Music","Interdisciplinary"], location:"Canada", amount:"Up to $5,000 (matched)", tags:["Mississauga","Emerging","Individual Artists","BIPOC","Diverse"], eligibility:"Mississauga-based artists and arts organizations. Applicant must provide matching funds. Projects must demonstrate community impact.", description:"Matching grant for Mississauga artists supporting project development with a dollar-for-dollar match from the applicant." },
  { id:29, name:"OAC \u2013 Dance", org:"Ontario Arts Council", open:"2026-02-01", close:"2026-05-01", url:"https://www.arts.on.ca/grants/discipline/dance", discipline:["Dance"], location:"Canada", amount:"Varies", tags:["Ontario","Dance","Emerging","BIPOC","Diaspora"], eligibility:"Ontario-based professional dance artists, organizations and collectives. Priority for underrepresented communities.", description:"Ontario Arts Council funding for dance artists and organizations supporting creation, production and presentation of dance." },
  { id:43, name:"OAC \u2013 Literature", org:"Ontario Arts Council", open:"2026-02-01", close:"2026-05-01", url:"https://www.arts.on.ca/grants/discipline/literature", discipline:["Writing"], location:"Canada", amount:"Varies", tags:["Ontario","Literary","Writing","Emerging","BIPOC"], eligibility:"Ontario-based professional writers and literary organizations. Priority for underrepresented communities.", description:"Ontario Arts Council funding for literary artists and organizations supporting the creation and dissemination of literary works." },
  { id:44, name:"OAC \u2013 Media Arts", org:"Ontario Arts Council", open:"2026-02-01", close:"2026-05-01", url:"https://www.arts.on.ca/grants/discipline/media-arts", discipline:["Film","Digital Media"], location:"Canada", amount:"Varies", tags:["Ontario","Media Arts","Film","Digital","Emerging","BIPOC"], eligibility:"Ontario-based professional media artists. Includes film, video, audio, digital media and new media. Priority for underrepresented communities.", description:"Ontario Arts Council funding for media artists working in film, video, audio, digital and new media art forms." },
  { id:45, name:"OAC \u2013 Multi and Inter-Arts", org:"Ontario Arts Council", open:"2026-02-01", close:"2026-05-01", url:"https://www.arts.on.ca/grants/discipline/multi-and-inter-arts", discipline:["Interdisciplinary"], location:"Canada", amount:"Varies", tags:["Ontario","Interdisciplinary","Multi-Arts","Emerging","BIPOC"], eligibility:"Ontario-based professional artists working across multiple disciplines. Priority for underrepresented communities.", description:"Ontario Arts Council funding for artists and organizations working across multiple artistic disciplines." },
  { id:46, name:"OAC \u2013 Music", org:"Ontario Arts Council", open:"2026-02-01", close:"2026-05-01", url:"https://www.arts.on.ca/grants/discipline/music", discipline:["Music"], location:"Canada", amount:"Varies", tags:["Ontario","Music","Emerging","BIPOC","Diaspora"], eligibility:"Ontario-based professional music artists and organizations. Priority for underrepresented communities.", description:"Ontario Arts Council funding for music artists and organizations supporting creation, recording and presentation of music." },
  { id:47, name:"OAC \u2013 Theatre", org:"Ontario Arts Council", open:"2026-02-01", close:"2026-05-01", url:"https://www.arts.on.ca/grants/discipline/theatre", discipline:["Theatre"], location:"Canada", amount:"Varies", tags:["Ontario","Theatre","Emerging","BIPOC","Diaspora"], eligibility:"Ontario-based professional theatre artists and organizations. Priority for underrepresented communities.", description:"Ontario Arts Council funding for theatre artists and organizations supporting creation, production and presentation of theatre." },
  { id:48, name:"OAC \u2013 Visual Arts", org:"Ontario Arts Council", open:"2026-02-01", close:"2026-05-01", url:"https://www.arts.on.ca/grants/discipline/visual-arts", discipline:["Visual Arts"], location:"Canada", amount:"Varies", tags:["Ontario","Visual Arts","Emerging","BIPOC","Diaspora"], eligibility:"Ontario-based professional visual artists and organizations. Priority for underrepresented communities.", description:"Ontario Arts Council funding for visual artists and organizations supporting creation, exhibition and presentation of visual art." },
  { id:30, name:"NSI Features First", org:"National Screen Institute (NSI)", open:"2026-05-01", close:"2026-08-15", url:"https://nsi-canada.ca/programs/", discipline:["Film"], location:"Canada", amount:"Development + mentorship", tags:["Feature Film","Emerging","Diverse","First Feature","Writers","Directors"], eligibility:"Canadian filmmakers with a feature film script in development. Applications from Indigenous, BIPOC, women, and other underrepresented groups strongly encouraged.", description:"Intensive development program for Canadian first- and second-time feature filmmakers, pairing writers and directors with industry mentors." },
];

const today = new Date();
const getDeadlineStatus = (close: string) => {
  if (close === "Rolling") return { label: "Rolling", color: "#5A9E6A", days: Infinity };
  const d = new Date(close), diff = Math.ceil((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { label: "Closed", color: "#999", days: diff };
  if (diff <= 14) return { label: `${diff}d left`, color: "#C0392B", days: diff };
  if (diff <= 45) return { label: `${diff}d left`, color: "#E67E22", days: diff };
  return { label: `${diff}d left`, color: "#27AE60", days: diff };
};
const ALL_DISCIPLINES = [...new Set(GRANTS.flatMap(g => g.discipline))].sort();
const ALL_TAGS = [...new Set(GRANTS.flatMap(g => g.tags))].sort();
const validatePostal = (v: string) => /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(v.trim());

interface Grant {
  id: number;
  name: string;
  org: string;
  open: string;
  close: string;
  url: string;
  discipline: string[];
  location: string;
  amount: string;
  tags: string[];
  eligibility: string;
  description: string;
}

interface UserInfo {
  name: string;
  email: string;
  province?: string;
  discipline?: string;
  career?: string;
}

function CanGrantsLogoImg({ size = "md" }: { size?: "lg" | "md" | "sm" }) {
  const dim = size === "lg" ? 80 : size === "sm" ? 40 : 55;
  return (
    <img src={canGrantsLogo} alt="CanGrants powered by BetterHalf Films" style={{ width:dim, height:dim, borderRadius:"50%", objectFit:"cover" }} />
  );
}

function LandingPage({ onAuth }: { onAuth: (user: UserInfo) => void }) {
  const [mode, setMode] = useState("welcome");
  const [form, setForm] = useState({ name:"", email:"", password:"", address:"", city:"", province:"", postal:"", discipline:"", career:"" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loginForm, setLoginForm] = useState({ email:"", password:"" });
  const [loginErr, setLoginErr] = useState("");
  const [users, setUsers] = useState([{ email:"demo@betterhalffilms.com", password:"demo123", name:"Demo Artist", province:"Ontario" }]);
  const [particles] = useState(() => Array.from({length:22}, (_,i) => ({ id:i, x:Math.random()*100, y:Math.random()*100, size: 1+Math.random()*2.5, delay:Math.random()*4, dur:3+Math.random()*5 })));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Full name is required";
    if (!form.email.includes("@")) e.email = "Valid email required";
    if (form.password.length < 6) e.password = "Min 6 characters";
    if (!form.address.trim()) e.address = "Street address required";
    if (!form.city.trim()) e.city = "City required";
    if (!form.province) e.province = "Select a province or territory";
    if (!validatePostal(form.postal)) e.postal = "Enter a valid Canadian postal code (e.g. M5V 1A1)";
    if (!form.discipline) e.discipline = "Select your primary discipline";
    return e;
  };

  const handleRegister = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    const newUser = { ...form };
    setUsers(p => [...p, newUser]);
    onAuth({ name: form.name, email: form.email, province: form.province, discipline: form.discipline, career: form.career });
  };

  const handleLogin = () => {
    const u = users.find(u => u.email === loginForm.email && u.password === loginForm.password);
    if (!u) { setLoginErr("Invalid email or password."); return; }
    onAuth({ name: u.name, email: u.email, province: u.province });
  };

  const inp = (field: string, label: string, type="text", opts: string[] | null = null) => {
    const isSelect = !!opts;
    const formVal = form[field as keyof typeof form];
    return (
      <div style={{ marginBottom:14 }}>
        <label style={{ display:"block", fontSize:11, fontWeight:600, color:"#A8C5A0", letterSpacing:"1px", textTransform:"uppercase", marginBottom:5 }}>{label}</label>
        {isSelect
          ? <select value={formVal} onChange={e => setForm(p=>({...p,[field]:e.target.value}))}
              style={{ width:"100%", padding:"11px 14px", background:"rgba(255,255,255,0.06)", border:`1px solid ${errors[field]?"#E74C3C":"rgba(200,168,75,0.3)"}`, borderRadius:8, color: formVal?"#F4EFE6":"#666", fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:"none", boxSizing:"border-box" }}>
              <option value="" disabled>Select...</option>
              {opts!.map(o => <option key={o} value={o} style={{background:"#0B2215",color:"#F4EFE6"}}>{o}</option>)}
            </select>
          : <input type={type} value={formVal} onChange={e => setForm(p=>({...p,[field]:e.target.value}))} placeholder={`Enter ${label.toLowerCase()}`}
              style={{ width:"100%", padding:"11px 14px", background:"rgba(255,255,255,0.06)", border:`1px solid ${errors[field]?"#E74C3C":"rgba(200,168,75,0.3)"}`, borderRadius:8, color:"#F4EFE6", fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:"none", boxSizing:"border-box" }} />
        }
        {errors[field] && <div style={{ fontSize:11, color:"#E74C3C", marginTop:4 }}>{errors[field]}</div>}
      </div>
    );
  };

  return (
    <div style={{ minHeight:"100vh", background:"#030E07", color:"#F4EFE6", fontFamily:"'DM Sans',sans-serif", position:"relative", overflowX:"hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600&family=Barlow:wght@700;800&display=swap" rel="stylesheet"/>

      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0 }}>
        {particles.map(p => (
          <div key={p.id} style={{ position:"absolute", left:`${p.x}%`, top:`${p.y}%`, width:p.size, height:p.size, borderRadius:"50%", background:"#C8A84B", opacity:0.25, animation:`drift ${p.dur}s ease-in-out ${p.delay}s infinite alternate` }}/>
        ))}
        <div style={{ position:"absolute", top:"-20%", left:"-10%", width:"60vw", height:"60vw", borderRadius:"50%", background:"radial-gradient(circle, rgba(11,34,21,0.8) 0%, transparent 70%)", pointerEvents:"none" }}/>
        <div style={{ position:"absolute", bottom:"-20%", right:"-10%", width:"50vw", height:"50vw", borderRadius:"50%", background:"radial-gradient(circle, rgba(200,168,75,0.07) 0%, transparent 70%)", pointerEvents:"none" }}/>
      </div>

      <div style={{ position:"relative", zIndex:10, padding:"20px 40px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid rgba(200,168,75,0.1)" }}>
        <CanGrantsLogoImg size="sm"/>
        <div style={{ display:"flex", gap:8 }}>
          {mode !== "login" && <button onClick={() => {setMode("login"); setErrors({});}} style={{ padding:"9px 20px", borderRadius:8, border:"1px solid rgba(200,168,75,0.4)", background:"transparent", color:"#C8A84B", fontSize:13, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontWeight:500 }}>Sign In</button>}
          {mode !== "register" && <button onClick={() => {setMode("register"); setErrors({});}} style={{ padding:"9px 20px", borderRadius:8, border:"none", background:"#C8A84B", color:"#0B2215", fontSize:13, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontWeight:700 }}>Create Account</button>}
        </div>
      </div>

      <div style={{ position:"relative", zIndex:5, maxWidth:1100, margin:"0 auto", padding:"0 24px" }}>

        {mode === "welcome" && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", paddingTop:"8vh" }}>
            <div style={{ width:60, height:2, background:"#C8A84B", marginBottom:28 }}/>
            <div style={{ fontSize:12, letterSpacing:"4px", color:"#6A9C6A", textTransform:"uppercase", marginBottom:20, fontWeight:500 }}>Welcome to</div>
            <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(56px,8vw,100px)", fontWeight:700, lineHeight:0.9, margin:"0 0 6px", letterSpacing:"-2px" }}>
              Can<span style={{ color:"#C8A84B" }}>Grants</span>
            </h1>
            <div style={{ width:120, height:1, background:"rgba(200,168,75,0.4)", margin:"24px auto" }}/>
            <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(18px,2.5vw,26px)", fontStyle:"italic", color:"#B8C5B0", lineHeight:1.5, maxWidth:680, marginBottom:10 }}>
              An interactive AI-powered grant tracking platform
            </p>
            <p style={{ fontSize:13, color:"#6A9C6A", letterSpacing:"2px", textTransform:"uppercase", marginBottom:6 }}>created by</p>
            <div style={{ marginBottom:32 }}><CanGrantsLogoImg size="sm"/></div>

            <div style={{ maxWidth:580, marginBottom:40 }}>
              <p style={{ fontSize:16, lineHeight:1.8, color:"#C5BFAC", margin:"0 0 16px" }}>
                A single search platform for <strong style={{ color:"#F4EFE6" }}>individual artists and producers based in Canada</strong> — discover, track, and apply for arts funding from coast to coast and around the world.
              </p>
              <div style={{ display:"flex", justifyContent:"center", gap:10, flexWrap:"wrap", margin:"24px 0" }}>
                {["Funding","Labs","Residencies","Tax Credits","International Programs"].map(t => (
                  <span key={t} style={{ padding:"6px 16px", borderRadius:20, border:"1px solid rgba(200,168,75,0.35)", color:"#C8A84B", fontSize:12, fontWeight:500, letterSpacing:"0.5px" }}>{t}</span>
                ))}
              </div>
            </div>

            <div style={{ background:"rgba(200,168,75,0.06)", border:"1px solid rgba(200,168,75,0.2)", borderRadius:20, padding:"40px 50px", maxWidth:580, width:"100%", backdropFilter:"blur(10px)", marginBottom:50 }}>
              <div style={{ fontSize:11, letterSpacing:"4px", color:"#C8A84B", textTransform:"uppercase", marginBottom:12 }}>CREATE \u00b7 APPLY \u00b7 TRACK</div>
              <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:32, fontWeight:700, margin:"0 0 12px", lineHeight:1.2 }}>
                Explore the world of<br/>arts grants
              </h2>
              <p style={{ fontSize:14, color:"#8A9C8A", lineHeight:1.7, margin:"0 0 28px" }}>
                30+ funding opportunities \u00b7 AI-powered eligibility matching \u00b7 Proposal drafting assistant \u00b7 Deadline tracker
              </p>
              <button onClick={() => setMode("register")} style={{ width:"100%", padding:"16px", borderRadius:12, border:"none", background:"#C8A84B", color:"#0B2215", fontSize:16, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", letterSpacing:"0.5px", marginBottom:14 }}>
                Create Your Account {"\u2192"}
              </button>
              <button onClick={() => setMode("login")} style={{ width:"100%", padding:"13px", borderRadius:12, border:"1px solid rgba(200,168,75,0.3)", background:"transparent", color:"#C8A84B", fontSize:14, fontWeight:500, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                I already have an account
              </button>
              <p style={{ fontSize:11, color:"#555", marginTop:14, lineHeight:1.5 }}>Registration restricted to Canadian residents \u00b7 Postal code verified</p>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:20, width:"100%", marginBottom:60 }}>
              {[
                { icon:"\ud83d\udd0d", title:"Grant Discovery", desc:"30+ curated grants from Telefilm, TAC, CMF, NFB, Sundance, Berlinale & more" },
                { icon:"\ud83e\udd16", title:"AI Assistant", desc:"Check eligibility, draft proposals, generate artist statements in seconds" },
                { icon:"\ud83d\udccb", title:"Application Tracker", desc:"Track every application from Not Started through to Submitted" },
                { icon:"\u2b50", title:"Save & Filter", desc:"Save your favourites, filter by discipline, location, deadline & identity" }
              ].map(f => (
                <div key={f.title} style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:14, padding:"22px 20px", textAlign:"left" }}>
                  <div style={{ fontSize:26, marginBottom:10 }}>{f.icon}</div>
                  <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, fontWeight:700, marginBottom:6, color:"#F4EFE6" }}>{f.title}</div>
                  <div style={{ fontSize:13, color:"#7A8A7A", lineHeight:1.6 }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {mode === "login" && (
          <div style={{ display:"flex", justifyContent:"center", paddingTop:"6vh" }}>
            <div style={{ width:"100%", maxWidth:440 }}>
              <button onClick={() => setMode("welcome")} style={{ background:"none", border:"none", color:"#6A9C6A", cursor:"pointer", fontSize:13, marginBottom:24, padding:0, fontFamily:"'DM Sans',sans-serif" }}>{"\u2190"} Back</button>
              <div style={{ width:40, height:2, background:"#C8A84B", marginBottom:20 }}/>
              <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:36, fontWeight:700, margin:"0 0 6px" }}>Sign In</h2>
              <p style={{ fontSize:14, color:"#6A8C6A", marginBottom:30 }}>Welcome back. Access your CanGrants dashboard.</p>
              <div style={{ marginBottom:14 }}>
                <label style={{ display:"block", fontSize:11, fontWeight:600, color:"#A8C5A0", letterSpacing:"1px", textTransform:"uppercase", marginBottom:5 }}>Email Address</label>
                <input type="email" value={loginForm.email} onChange={e => setLoginForm(p=>({...p,email:e.target.value}))} placeholder="your@email.com"
                  style={{ width:"100%", padding:"12px 14px", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(200,168,75,0.3)", borderRadius:8, color:"#F4EFE6", fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:"none", boxSizing:"border-box" }}/>
              </div>
              <div style={{ marginBottom:22 }}>
                <label style={{ display:"block", fontSize:11, fontWeight:600, color:"#A8C5A0", letterSpacing:"1px", textTransform:"uppercase", marginBottom:5 }}>Password</label>
                <input type="password" value={loginForm.password} onChange={e => setLoginForm(p=>({...p,password:e.target.value}))} placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
                  onKeyDown={e => e.key==="Enter" && handleLogin()}
                  style={{ width:"100%", padding:"12px 14px", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(200,168,75,0.3)", borderRadius:8, color:"#F4EFE6", fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:"none", boxSizing:"border-box" }}/>
              </div>
              {loginErr && <div style={{ background:"rgba(192,57,43,0.15)", border:"1px solid rgba(192,57,43,0.4)", borderRadius:8, padding:"10px 14px", fontSize:13, color:"#E74C3C", marginBottom:16 }}>{loginErr}</div>}
              <button onClick={handleLogin} style={{ width:"100%", padding:"14px", borderRadius:10, border:"none", background:"#C8A84B", color:"#0B2215", fontSize:15, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", marginBottom:14 }}>
                Sign In {"\u2192"}
              </button>
              <p style={{ textAlign:"center", fontSize:13, color:"#666" }}>
                Don't have an account?{" "}
                <button onClick={() => {setMode("register"); setErrors({});}} style={{ background:"none", border:"none", color:"#C8A84B", cursor:"pointer", fontSize:13, fontFamily:"'DM Sans',sans-serif", fontWeight:600 }}>Create one</button>
              </p>
              <div style={{ marginTop:20, padding:"12px", background:"rgba(200,168,75,0.06)", borderRadius:8, fontSize:12, color:"#888", textAlign:"center" }}>
                Demo: demo@betterhalffilms.com \u00b7 demo123
              </div>
            </div>
          </div>
        )}

        {mode === "register" && (
          <div style={{ display:"flex", justifyContent:"center", paddingTop:"4vh", paddingBottom:60 }}>
            <div style={{ width:"100%", maxWidth:560 }}>
              <button onClick={() => setMode("welcome")} style={{ background:"none", border:"none", color:"#6A9C6A", cursor:"pointer", fontSize:13, marginBottom:24, padding:0, fontFamily:"'DM Sans',sans-serif" }}>{"\u2190"} Back</button>
              <div style={{ width:40, height:2, background:"#C8A84B", marginBottom:20 }}/>
              <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:36, fontWeight:700, margin:"0 0 6px" }}>Create Your Account</h2>
              <p style={{ fontSize:14, color:"#6A8C6A", marginBottom:8 }}>Join CanGrants — Canada's AI-powered grant platform for artists and producers.</p>
              <div style={{ background:"rgba(200,168,75,0.08)", border:"1px solid rgba(200,168,75,0.2)", borderRadius:8, padding:"10px 14px", fontSize:12, color:"#B8A055", marginBottom:26 }}>
                <strong>Canadian residents only.</strong> A valid Canadian postal code is required to create an account.
              </div>

              <div style={{ fontSize:11, fontWeight:700, color:"#C8A84B", letterSpacing:"2px", textTransform:"uppercase", marginBottom:14, paddingBottom:8, borderBottom:"1px solid rgba(200,168,75,0.15)" }}>Personal Info</div>
              {inp("name","Full Name")}
              {inp("email","Email Address","email")}
              {inp("password","Password","password")}

              <div style={{ fontSize:11, fontWeight:700, color:"#C8A84B", letterSpacing:"2px", textTransform:"uppercase", margin:"20px 0 14px", paddingBottom:8, borderBottom:"1px solid rgba(200,168,75,0.15)" }}>Canadian Address</div>
              {inp("address","Street Address")}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>{inp("city","City")}</div>
                <div>{inp("postal","Postal Code")}<div style={{ fontSize:11, color:"#555", marginTop:2 }}>Format: A1A 1A1</div></div>
              </div>
              {inp("province","Province / Territory","text", CA_PROVINCES)}

              <div style={{ fontSize:11, fontWeight:700, color:"#C8A84B", letterSpacing:"2px", textTransform:"uppercase", margin:"20px 0 14px", paddingBottom:8, borderBottom:"1px solid rgba(200,168,75,0.15)" }}>Your Practice</div>
              {inp("discipline","Primary Discipline","text", ["Film","Documentary","Animation","Television","Digital Media","Visual Arts","Music","Writing","Interdisciplinary","Other"])}
              {inp("career","Career Stage","text", ["Emerging (0\u20135 years)","Mid-Career (5\u201315 years)","Established (15+ years)","Student","Organization / Company"])}

              <button onClick={handleRegister} style={{ width:"100%", padding:"15px", borderRadius:10, border:"none", background:"#C8A84B", color:"#0B2215", fontSize:16, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", marginTop:10, marginBottom:12, letterSpacing:"0.5px" }}>
                Create Account & Explore Grants {"\u2192"}
              </button>
              <p style={{ textAlign:"center", fontSize:13, color:"#666" }}>
                Already have an account?{" "}
                <button onClick={() => setMode("login")} style={{ background:"none", border:"none", color:"#C8A84B", cursor:"pointer", fontSize:13, fontFamily:"'DM Sans',sans-serif", fontWeight:600 }}>Sign in</button>
              </p>
            </div>
          </div>
        )}
      </div>

      <div style={{ position:"relative", zIndex:5, borderTop:"1px solid rgba(200,168,75,0.1)", padding:"24px 40px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:16, marginTop:20 }}>
        <CanGrantsLogoImg size="sm"/>
        <div style={{ fontSize:12, color:"#444", textAlign:"right" }}>
          <div style={{ color:"#C8A84B", fontWeight:600, fontSize:13 }}>CanGrants</div>
          <div>{"\u00A9"} 2026 BetterHalf Films {"\u00b7"} Toronto, Canada {"\u00b7"} betterhalffilms.com</div>
          <div style={{ marginTop:3 }}>Proudly built for Canadian artists & producers</div>
        </div>
      </div>

      <style>{`
        @keyframes drift {
          from { transform: translateY(0px) translateX(0px); opacity:0.15; }
          to { transform: translateY(-20px) translateX(10px); opacity:0.35; }
        }
      `}</style>
    </div>
  );
}

function Dashboard({ user, onLogout }: { user: UserInfo; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState("discover");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ discipline:"", location:"", tag:"", deadline:"" });
  const [saved, setSaved] = useState(new Set([1,7,23]));
  const [applications, setApplications] = useState([
    { id:7, status:"In Progress", notes:"TAC Film & Media \u2014 draft 80% done" },
    { id:28, status:"Submitted", notes:"MAC Matchmaker \u2014 submitted March 2026" },
    { id:23, status:"Not Started", notes:"" }
  ]);
  const [selectedGrant, setSelectedGrant] = useState<Grant | null>(null);
  const [messages, setMessages] = useState([
    { role:"assistant" as const, content:`Welcome back, ${user.name}!\n\nI'm your CanGrants AI assistant. I can help you find the right grants, check your eligibility, and draft compelling proposals. What would you like to work on today?` }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  const filtered = GRANTS.filter(g => {
    const q = search.toLowerCase();
    const matchSearch = !q || g.name.toLowerCase().includes(q) || g.org.toLowerCase().includes(q) || g.discipline.some(d=>d.toLowerCase().includes(q)) || g.tags.some(t=>t.toLowerCase().includes(q));
    const matchDisc = !filters.discipline || g.discipline.includes(filters.discipline);
    const matchLoc = !filters.location || g.location === filters.location;
    const matchTag = !filters.tag || g.tags.includes(filters.tag);
    const matchDead = !filters.deadline || (() => {
      if (filters.deadline==="rolling") return g.close==="Rolling";
      if (filters.deadline==="urgent") return getDeadlineStatus(g.close).days<=14;
      if (filters.deadline==="month") { const d=getDeadlineStatus(g.close); return d.days>14&&d.days<=45; }
      return true;
    })();
    return matchSearch&&matchDisc&&matchLoc&&matchTag&&matchDead;
  });

  const toggleSave = (id: number) => setSaved(prev => { const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });
  const addApplication = (grant: Grant) => { if (!applications.find(a=>a.id===grant.id)) setApplications(p=>[...p,{id:grant.id,status:"Not Started",notes:""}]); };
  const updateAppStatus = (id: number, status: string) => setApplications(p=>p.map(a=>a.id===id?{...a,status}:a));

  const sendMessage = async () => {
    if (!input.trim()||loading) return;
    const userMsg = {role:"user" as const, content:input};
    setMessages(p=>[...p,userMsg]); setInput(""); setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/chat`.replace(/\/\//g, '/'), {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          messages:[...messages,userMsg].map(m=>({role:m.role,content:m.content})),
          userName: user.name,
          userProvince: user.province || "Canada",
          userDiscipline: user.discipline || "",
        })
      });
      const data = await res.json();
      setMessages(p=>[...p,{role:"assistant" as const,content:data.content||"Sorry, try again."}]);
    } catch { setMessages(p=>[...p,{role:"assistant" as const,content:"Connection error. Please try again."}]); }
    setLoading(false);
  };

  const savedGrants = GRANTS.filter(g=>saved.has(g.id));
  const appGrants = applications.map(a=>({...a,grant:GRANTS.find(g=>g.id===a.id)!}));
  const statusColors: Record<string,string> = {"Not Started":"#8B6914","In Progress":"#1A6BC4","Submitted":"#1E7A3E"};
  const statusBg: Record<string,string> = {"Not Started":"#FEF3C7","In Progress":"#DBEAFE","Submitted":"#D1FAE5"};

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:"#F4EFE6", minHeight:"100vh", color:"#1A1208" }}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&family=Barlow:wght@700;800&display=swap" rel="stylesheet"/>

      <header style={{ background:"#0B2215", color:"#F4EFE6", padding:"0 24px", display:"flex", alignItems:"center", justifyContent:"space-between", height:62, position:"sticky", top:0, zIndex:100, boxShadow:"0 2px 20px rgba(0,0,0,0.3)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:18 }}>
          <CanGrantsLogoImg size="sm" />
          <div style={{ width:1, height:28, background:"rgba(200,168,75,0.3)" }}/>
          <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontWeight:700, letterSpacing:"-0.5px", color:"#C8A84B" }}>CanGrants</span>
        </div>
        <div style={{ display:"flex", gap:4, alignItems:"center" }}>
          <nav style={{ display:"flex", gap:3 }}>
            {[{id:"discover",label:"Discover"},{id:"saved",label:`Saved (${saved.size})`},{id:"applications",label:"My Applications"},{id:"assistant",label:"AI Assistant"}].map(tab => (
              <button key={tab.id} onClick={()=>setActiveTab(tab.id)} style={{ background:activeTab===tab.id?"#C8A84B":"transparent", color:activeTab===tab.id?"#0B2215":"#A8C5A0", border:"none", borderRadius:6, padding:"7px 13px", fontSize:12, fontWeight:500, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>{tab.label}</button>
            ))}
          </nav>
          <div style={{ width:1, height:24, background:"rgba(200,168,75,0.2)", margin:"0 8px" }}/>
          <div style={{ fontSize:12, color:"#6A9C6A", marginRight:8 }}>{user.name.split(" ")[0]}</div>
          <button onClick={onLogout} style={{ padding:"6px 12px", borderRadius:6, border:"1px solid rgba(200,168,75,0.3)", background:"transparent", color:"#C8A84B", fontSize:11, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Sign Out</button>
        </div>
      </header>

      <div style={{ maxWidth:1200, margin:"0 auto", padding:"28px 20px" }}>

        {activeTab==="discover" && (
          <div>
            <div style={{ marginBottom:28, display:"flex", gap:16, flexWrap:"wrap", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:32, fontWeight:700, margin:"0 0 4px", color:"#0B2215" }}>Grant Discovery</h1>
                <p style={{ margin:0, color:"#5A6B5A", fontSize:14 }}>{GRANTS.length} opportunities \u00b7 Canadian &amp; International \u00b7 Updated 2026</p>
              </div>
              <div style={{ display:"flex", gap:12 }}>
                {[{label:"Total",value:GRANTS.length,color:"#C8A84B"},{label:"Canadian",value:GRANTS.filter(g=>g.location==="Canada").length,color:"#2D7D46"},{label:"International",value:GRANTS.filter(g=>g.location==="International").length,color:"#1A5FA8"}].map(s=>(
                  <div key={s.label} style={{ background:"#fff", borderRadius:10, padding:"12px 20px", textAlign:"center", boxShadow:"0 1px 6px rgba(0,0,0,0.07)", minWidth:80 }}>
                    <div style={{ fontSize:22, fontWeight:700, fontFamily:"'Cormorant Garamond',serif", color:s.color }}>{s.value}</div>
                    <div style={{ fontSize:11, color:"#888" }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background:"#fff", borderRadius:14, padding:20, marginBottom:24, boxShadow:"0 2px 12px rgba(0,0,0,0.06)", border:"1px solid #E8E0D0" }}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search grants, organizations, disciplines, tags..." style={{ width:"100%", padding:"12px 16px", borderRadius:8, border:"1.5px solid #D5CBB8", fontSize:14, fontFamily:"'DM Sans',sans-serif", background:"#FAFAF7", outline:"none", boxSizing:"border-box", marginBottom:14, color:"#1A1208" }}/>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                {[{key:"discipline",label:"Discipline",opts:ALL_DISCIPLINES},{key:"location",label:"Location",opts:["Canada","International"]},{key:"deadline",label:"Deadline",opts:[["urgent","Urgent (\u226414 days)"],["month","This Month"],["rolling","Rolling"]]},{key:"tag",label:"For\u2026",opts:ALL_TAGS}].map(({key,label,opts})=>(
                  <select key={key} value={filters[key as keyof typeof filters]} onChange={e=>setFilters(p=>({...p,[key]:e.target.value}))} style={{ padding:"8px 12px", borderRadius:8, border:"1.5px solid #D5CBB8", fontSize:13, background:"#fff", fontFamily:"'DM Sans',sans-serif", color:"#1A1208", cursor:"pointer" }}>
                    <option value="">{label}: All</option>
                    {opts.map(o=>Array.isArray(o)?<option key={o[0]} value={o[0]}>{o[1]}</option>:<option key={o} value={o}>{o}</option>)}
                  </select>
                ))}
                {(search||Object.values(filters).some(Boolean))&&<button onClick={()=>{setSearch("");setFilters({discipline:"",location:"",tag:"",deadline:""}); }} style={{ padding:"8px 14px", borderRadius:8, border:"1px solid #E0D5C5", background:"transparent", fontSize:13, cursor:"pointer", color:"#888", fontFamily:"'DM Sans',sans-serif" }}>Clear all</button>}
              </div>
            </div>
            <p style={{ fontSize:13, color:"#888", marginBottom:16 }}>Showing {filtered.length} of {GRANTS.length} grants</p>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))", gap:18 }}>
              {filtered.map(g=>{
                const dl=getDeadlineStatus(g.close), isSaved=saved.has(g.id), hasApp=applications.find(a=>a.id===g.id);
                return (
                  <div key={g.id} style={{ background:"#fff", borderRadius:14, border:"1px solid #E8E0D0", boxShadow:"0 2px 10px rgba(0,0,0,0.05)", overflow:"hidden", display:"flex", flexDirection:"column" }}>
                    <div style={{ background:g.location==="Canada"?"#0B2215":"#1A2F5A", padding:"14px 18px", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:10, letterSpacing:"1.5px", color:g.location==="Canada"?"#6A9C6A":"#6A8CC8", textTransform:"uppercase", marginBottom:4 }}>{g.location} \u00b7 {g.discipline.slice(0,2).join(", ")}</div>
                        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, fontWeight:700, color:"#F4EFE6", lineHeight:1.2 }}>{g.name}</div>
                        <div style={{ fontSize:12, color:"#A8C5A0", marginTop:3 }}>{g.org}</div>
                      </div>
                      <button onClick={()=>toggleSave(g.id)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:18, padding:"0 0 0 8px", color:isSaved?"#C8A84B":"#4A6A4A" }}>{isSaved?"\u2605":"\u2606"}</button>
                    </div>
                    <div style={{ padding:"14px 18px", flex:1, display:"flex", flexDirection:"column", gap:10 }}>
                      <p style={{ margin:0, fontSize:13, color:"#5A6B5A", lineHeight:1.5 }}>{g.description}</p>
                      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                        {g.tags.slice(0,3).map(t=><span key={t} style={{ background:"#EEF5EE", color:"#2A5C2A", fontSize:11, padding:"3px 8px", borderRadius:20, fontWeight:500 }}>{t}</span>)}
                      </div>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:"auto" }}>
                        <div><div style={{ fontSize:11, color:"#888", marginBottom:1 }}>Deadline</div><span style={{ background:dl.color+"20", color:dl.color, fontSize:12, fontWeight:600, padding:"3px 9px", borderRadius:12, border:`1px solid ${dl.color}40` }}>{dl.label}</span></div>
                        <div style={{ textAlign:"right" }}><div style={{ fontSize:11, color:"#888", marginBottom:1 }}>Amount</div><div style={{ fontSize:13, fontWeight:600, color:"#1A7A3A" }}>{g.amount}</div></div>
                      </div>
                    </div>
                    <div style={{ padding:"12px 18px", borderTop:"1px solid #F0E8D8", display:"flex", gap:8 }}>
                      <button onClick={()=>setSelectedGrant(g)} style={{ flex:1, padding:"8px 0", borderRadius:8, border:"1.5px solid #D5CBB8", background:"transparent", fontSize:13, cursor:"pointer", color:"#5A4A2A", fontFamily:"'DM Sans',sans-serif", fontWeight:500 }}>Details</button>
                      <button onClick={()=>{addApplication(g);setActiveTab("applications");}} style={{ flex:1, padding:"8px 0", borderRadius:8, border:"none", background:hasApp?"#E8F5E8":"#0B2215", color:hasApp?"#1A7A3A":"#C8A84B", fontSize:13, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontWeight:500 }}>{hasApp?"\u2713 Tracking":"Track"}</button>
                      <a href={g.url} target="_blank" rel="noopener noreferrer" style={{ flex:1, padding:"8px 0", borderRadius:8, border:"none", background:"#C8A84B", color:"#0B2215", fontSize:13, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontWeight:600, textDecoration:"none", textAlign:"center", lineHeight:"1.8" }}>Apply {"\u2197"}</a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab==="saved" && (
          <div>
            <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:32, fontWeight:700, marginBottom:8, color:"#0B2215" }}>Saved Grants</h1>
            <p style={{ color:"#5A6B5A", fontSize:14, marginBottom:24 }}>{saved.size} grants saved to your list</p>
            {savedGrants.length===0?(<div style={{ textAlign:"center", padding:"60px 0", color:"#888" }}><div style={{ fontSize:40, marginBottom:12 }}>\u2606</div><p>No saved grants yet. Star grants in Discover.</p></div>):(
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                {savedGrants.map(g=>{
                  const dl=getDeadlineStatus(g.close), hasApp=applications.find(a=>a.id===g.id);
                  return (
                    <div key={g.id} style={{ background:"#fff", borderRadius:12, border:"1px solid #E8E0D0", padding:"18px 22px", display:"flex", gap:18, alignItems:"center", boxShadow:"0 1px 8px rgba(0,0,0,0.04)" }}>
                      <div style={{ width:6, alignSelf:"stretch", background:g.location==="Canada"?"#2D7D46":"#1A5FA8", borderRadius:3, flexShrink:0 }}/>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", gap:8, alignItems:"baseline", marginBottom:3 }}>
                          <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, fontWeight:700, color:"#0B2215" }}>{g.name}</span>
                          <span style={{ fontSize:12, color:"#888" }}>\u00b7 {g.org}</span>
                        </div>
                        <p style={{ margin:"4px 0", fontSize:13, color:"#5A6B5A" }}>{g.eligibility.slice(0,120)}\u2026</p>
                        <div style={{ display:"flex", gap:8, marginTop:6, flexWrap:"wrap" }}>
                          {g.tags.slice(0,3).map(t=><span key={t} style={{ background:"#EEF5EE", color:"#2A5C2A", fontSize:11, padding:"2px 7px", borderRadius:12 }}>{t}</span>)}
                        </div>
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", gap:8, alignItems:"flex-end", flexShrink:0 }}>
                        <span style={{ background:dl.color+"20", color:dl.color, fontSize:12, fontWeight:600, padding:"3px 10px", borderRadius:12 }}>{dl.label}</span>
                        <span style={{ fontSize:13, fontWeight:600, color:"#1A7A3A" }}>{g.amount}</span>
                        <div style={{ display:"flex", gap:6 }}>
                          <button onClick={()=>toggleSave(g.id)} style={{ padding:"6px 12px", borderRadius:7, border:"1px solid #E0D5C5", background:"transparent", fontSize:12, cursor:"pointer", color:"#888" }}>Remove</button>
                          <button onClick={()=>{addApplication(g);setActiveTab("applications");}} style={{ padding:"6px 12px", borderRadius:7, border:"none", background:hasApp?"#E8F5E8":"#0B2215", color:hasApp?"#1A7A3A":"#C8A84B", fontSize:12, cursor:"pointer", fontWeight:500 }}>{hasApp?"\u2713 Tracked":"Track"}</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab==="applications" && (
          <div>
            <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:32, fontWeight:700, marginBottom:8, color:"#0B2215" }}>My Applications</h1>
            <p style={{ color:"#5A6B5A", fontSize:14, marginBottom:24 }}>Track your grant applications and their status</p>
            {["Not Started","In Progress","Submitted"].map(status=>{
              const apps=appGrants.filter(a=>a.status===status&&a.grant);
              return (
                <div key={status} style={{ marginBottom:28 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                    <span style={{ background:statusBg[status], color:statusColors[status], fontSize:12, fontWeight:600, padding:"4px 12px", borderRadius:20 }}>{status}</span>
                    <span style={{ fontSize:13, color:"#888" }}>{apps.length} grant{apps.length!==1?"s":""}</span>
                  </div>
                  {apps.length===0?(<div style={{ background:"#FAFAF7", borderRadius:10, padding:"20px", textAlign:"center", color:"#bbb", fontSize:13, border:"1px dashed #E0D5C5" }}>No grants here yet</div>):(
                    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                      {apps.map(({grant,id,notes})=>{
                        const dl=getDeadlineStatus(grant.close);
                        return (
                          <div key={id} style={{ background:"#fff", borderRadius:12, border:"1px solid #E8E0D0", padding:"16px 20px", display:"flex", gap:16, alignItems:"center" }}>
                            <div style={{ flex:1 }}>
                              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:17, fontWeight:700, color:"#0B2215" }}>{grant.name}</div>
                              <div style={{ fontSize:12, color:"#888", marginBottom:notes?6:0 }}>{grant.org} \u00b7 {grant.amount}</div>
                              {notes&&<div style={{ fontSize:12, color:"#5A6B5A", background:"#F7F2E8", padding:"5px 10px", borderRadius:6, marginTop:4 }}>{notes}</div>}
                            </div>
                            <div style={{ display:"flex", flexDirection:"column", gap:8, alignItems:"flex-end", flexShrink:0 }}>
                              <span style={{ background:dl.color+"20", color:dl.color, fontSize:12, fontWeight:600, padding:"3px 10px", borderRadius:12 }}>{dl.label}</span>
                              <select value={status} onChange={e=>updateAppStatus(id,e.target.value)} style={{ padding:"5px 10px", borderRadius:7, border:"1px solid #D5CBB8", fontSize:12, fontFamily:"'DM Sans',sans-serif", background:"#fff", cursor:"pointer" }}>
                                {["Not Started","In Progress","Submitted"].map(s=><option key={s} value={s}>{s}</option>)}
                              </select>
                              <button onClick={()=>{setInput(`Help me write a grant proposal for ${grant.name} by ${grant.org}. Amount: ${grant.amount}. My project is...`);setActiveTab("assistant");}} style={{ padding:"5px 12px", borderRadius:7, border:"none", background:"#C8A84B", color:"#0B2215", fontSize:12, cursor:"pointer", fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>AI Draft {"\u2192"}</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab==="assistant" && (
          <div style={{ maxWidth:760, margin:"0 auto" }}>
            <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:32, fontWeight:700, marginBottom:6, color:"#0B2215" }}>AI Grant Assistant</h1>
            <p style={{ color:"#5A6B5A", fontSize:14, margin:"0 0 20px" }}>Ask about eligibility, get grant recommendations, draft proposals and artist statements</p>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:20 }}>
              {["Which grants am I eligible for as a South Asian diaspora filmmaker in Toronto?","Draft an artist statement for Soso Park for the MAC Matchmaker grant","What are the most urgent upcoming deadlines?","Help me write a project summary for Son of Soil"].map(p=>(
                <button key={p} onClick={()=>setInput(p)} style={{ padding:"8px 14px", borderRadius:20, border:"1.5px solid #C8A84B", background:"#FEF8EC", color:"#7A5A0A", fontSize:12, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontWeight:500 }}>
                  {p.length>50?p.slice(0,50)+"\u2026":p}
                </button>
              ))}
            </div>
            <div style={{ background:"#fff", borderRadius:16, border:"1px solid #E8E0D0", boxShadow:"0 2px 20px rgba(0,0,0,0.06)", overflow:"hidden" }}>
              <div style={{ height:460, overflowY:"auto", padding:"24px 24px 12px" }}>
                {messages.map((m,i)=>(
                  <div key={i} style={{ marginBottom:18, display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start" }}>
                    {m.role==="assistant"&&<div style={{ width:30, height:30, borderRadius:8, background:"#0B2215", color:"#C8A84B", fontSize:14, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", marginRight:10, flexShrink:0, fontFamily:"'Cormorant Garamond',serif" }}>C</div>}
                    <div style={{ background:m.role==="user"?"#0B2215":"#F7F2E8", color:m.role==="user"?"#F4EFE6":"#1A1208", padding:"12px 16px", borderRadius:m.role==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px", maxWidth:"78%", fontSize:14, lineHeight:1.65, whiteSpace:"pre-wrap" }}>{m.content}</div>
                  </div>
                ))}
                {loading&&<div style={{ display:"flex", gap:10, alignItems:"center", padding:"8px 0" }}>
                  <div style={{ width:30, height:30, borderRadius:8, background:"#0B2215", color:"#C8A84B", fontSize:14, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Cormorant Garamond',serif" }}>C</div>
                  <div style={{ display:"flex", gap:5 }}>{[0,1,2].map(i=><div key={i} style={{ width:7, height:7, borderRadius:"50%", background:"#C8A84B", animation:"pulse 1.2s ease-in-out infinite", animationDelay:`${i*0.2}s` }}/>)}</div>
                </div>}
                <div ref={chatEndRef}/>
              </div>
              <div style={{ padding:"14px 18px", borderTop:"1px solid #F0E8D8", display:"flex", gap:10 }}>
                <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}}} placeholder="Ask about grants, eligibility, or request a draft..." rows={2}
                  style={{ flex:1, padding:"10px 14px", borderRadius:10, border:"1.5px solid #D5CBB8", fontSize:14, fontFamily:"'DM Sans',sans-serif", resize:"none", outline:"none", background:"#FAFAF7", color:"#1A1208", lineHeight:1.5 }}/>
                <button onClick={sendMessage} disabled={loading||!input.trim()} style={{ padding:"10px 20px", borderRadius:10, border:"none", background:loading||!input.trim()?"#D5CBB8":"#0B2215", color:loading||!input.trim()?"#888":"#C8A84B", fontWeight:600, fontSize:14, cursor:loading||!input.trim()?"not-allowed":"pointer", fontFamily:"'DM Sans',sans-serif", alignSelf:"flex-end" }}>Send</button>
              </div>
            </div>
            <p style={{ textAlign:"center", fontSize:12, color:"#aaa", marginTop:12 }}>Powered by Claude \u00b7 Tailored for BetterHalf Films slate</p>
          </div>
        )}
      </div>

      <footer style={{ borderTop:"1px solid #E8E0D0", padding:"24px 40px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:16, marginTop:40, background:"#fff" }}>
        <CanGrantsLogoImg size="md" />
        <div style={{ textAlign:"right", fontSize:12, color:"#888" }}>
          <div style={{ color:"#C8A84B", fontWeight:600, fontSize:14, fontFamily:"'Cormorant Garamond',serif" }}>CanGrants</div>
          <div>{"\u00A9"} 2026 BetterHalf Films {"\u00b7"} Toronto, Canada {"\u00b7"} betterhalffilms.com</div>
          <div style={{ marginTop:3 }}>A platform for Canadian artists & producers</div>
        </div>
      </footer>

      {selectedGrant&&(
        <div onClick={()=>setSelectedGrant(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:"#fff", borderRadius:18, maxWidth:600, width:"100%", maxHeight:"85vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ background:selectedGrant.location==="Canada"?"#0B2215":"#1A2F5A", padding:"22px 26px", borderRadius:"18px 18px 0 0" }}>
              <div style={{ fontSize:11, letterSpacing:"1.5px", color:selectedGrant.location==="Canada"?"#6A9C6A":"#6A8CC8", textTransform:"uppercase", marginBottom:6 }}>{selectedGrant.location} \u00b7 {selectedGrant.discipline.join(", ")}</div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:24, fontWeight:700, color:"#F4EFE6" }}>{selectedGrant.name}</div>
              <div style={{ fontSize:14, color:"#A8C5A0", marginTop:4 }}>{selectedGrant.org}</div>
            </div>
            <div style={{ padding:"24px 26px" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }}>
                {[{label:"Amount",value:selectedGrant.amount},{label:"Deadline",value:selectedGrant.close==="Rolling"?"Rolling":new Date(selectedGrant.close).toLocaleDateString("en-CA",{month:"long",day:"numeric",year:"numeric"})},{label:"Opens",value:new Date(selectedGrant.open).toLocaleDateString("en-CA",{month:"long",day:"numeric",year:"numeric"})},{label:"Location",value:selectedGrant.location}].map(({label,value})=>(
                  <div key={label} style={{ background:"#F7F2E8", borderRadius:10, padding:"12px 16px" }}>
                    <div style={{ fontSize:11, color:"#888", marginBottom:2 }}>{label}</div>
                    <div style={{ fontSize:15, fontWeight:600, color:"#0B2215" }}>{value}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginBottom:18 }}>
                <div style={{ fontSize:12, fontWeight:600, color:"#C8A84B", letterSpacing:"1px", textTransform:"uppercase", marginBottom:8 }}>Description</div>
                <p style={{ margin:0, fontSize:14, color:"#3A3A2A", lineHeight:1.7 }}>{selectedGrant.description}</p>
              </div>
              <div style={{ marginBottom:18 }}>
                <div style={{ fontSize:12, fontWeight:600, color:"#C8A84B", letterSpacing:"1px", textTransform:"uppercase", marginBottom:8 }}>Eligibility</div>
                <p style={{ margin:0, fontSize:14, color:"#3A3A2A", lineHeight:1.7 }}>{selectedGrant.eligibility}</p>
              </div>
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:12, fontWeight:600, color:"#C8A84B", letterSpacing:"1px", textTransform:"uppercase", marginBottom:8 }}>Tags</div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {selectedGrant.tags.map(t=><span key={t} style={{ background:"#EEF5EE", color:"#2A5C2A", fontSize:12, padding:"4px 10px", borderRadius:20, fontWeight:500 }}>{t}</span>)}
                </div>
              </div>
              <div style={{ display:"flex", gap:10, marginTop:20 }}>
                <a href={selectedGrant.url} target="_blank" rel="noopener noreferrer" style={{ flex:1, padding:"12px 0", borderRadius:10, border:"none", background:"#C8A84B", color:"#0B2215", fontSize:14, fontWeight:700, textDecoration:"none", textAlign:"center", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Apply Now {"\u2197"}</a>
                <button onClick={()=>setSelectedGrant(null)} style={{ flex:1, padding:"12px 0", borderRadius:10, border:"1.5px solid #D5CBB8", background:"transparent", fontSize:14, cursor:"pointer", color:"#5A4A2A", fontFamily:"'DM Sans',sans-serif", fontWeight:500 }}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}

function App() {
  const [user, setUser] = useState<UserInfo | null>(null);

  if (!user) {
    return <LandingPage onAuth={setUser} />;
  }

  return <Dashboard user={user} onLogout={() => setUser(null)} />;
}

export default App;

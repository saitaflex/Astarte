-- Configuration data (not user data): categories, reward activities, the incubation journey and guides.

insert into public.categories (slug, name_en, name_fr, name_ar, atmosphere, sort) values
 ('painting','Painting','Peinture','الرسم','paint',1),
 ('illustration','Illustration','Illustration','الرسم التوضيحي','paint',2),
 ('sculpture','Sculpture','Sculpture','النحت','clay',3),
 ('pottery','Pottery & ceramics','Poterie & céramique','الفخار والخزف','clay',4),
 ('carpentry','Carpentry','Menuiserie','النجارة','material',5),
 ('metalwork','Metalwork','Ferronnerie & dinanderie','الحدادة والنحاس','material',6),
 ('leather','Leatherwork','Maroquinerie','الصناعات الجلدية','material',7),
 ('jewelry','Jewelry','Bijouterie','المجوهرات','material',8),
 ('embroidery','Embroidery','Broderie','التطريز','textile',9),
 ('textiles','Carpets & textiles','Tapis & textiles','الزرابي والنسيج','textile',10),
 ('fashion','Fashion','Mode','الموضة','textile',11),
 ('traditional-crafts','Traditional Tunisian crafts','Artisanat tunisien','الصناعات التقليدية التونسية','textile',12),
 ('photography','Photography','Photographie','التصوير الفوتوغرافي','photo',13),
 ('videography','Videography','Vidéographie','التصوير بالفيديو','photo',14),
 ('music','Music','Musique','الموسيقى','music',15),
 ('singing','Singing','Chant','الغناء','music',16),
 ('composition','Composition','Composition','التأليف الموسيقي','music',17),
 ('graphic-design','Graphic design','Design graphique','التصميم الغرافيكي','design',18),
 ('animation','Animation','Animation','الرسوم المتحركة','design',19),
 ('architecture','Architecture','Architecture','الهندسة المعمارية','design',20),
 ('interior-design','Interior design','Design d''intérieur','التصميم الداخلي','design',21),
 ('furniture-design','Furniture design','Design de mobilier','تصميم الأثاث','design',22),
 ('studios','Creative studios','Studios créatifs','استوديوهات إبداعية','design',23);

insert into public.point_activities (code, title_en, title_fr, title_ar, description_en, description_fr, description_ar, points, min_seconds, daily_limit) values
 ('profile_discovery','Discover an artist','Découvrir un artiste','اكتشف فنانًا',
  'Spend at least 20 seconds exploring an artist profile you have not explored before.',
  'Passez au moins 20 secondes sur le profil d''un artiste que vous n''avez pas encore découvert.',
  'اقضِ 20 ثانية على الأقل في استكشاف ملف فنان لم تزره من قبل.', 5, 20, 5),
 ('post_read','Read an artist story','Lire une histoire d''artiste','اقرأ قصة فنان',
  'Read a post where an artist shares their journey, technique or work. Once per post.',
  'Lisez une publication où un artiste partage son parcours, sa technique ou son travail. Une fois par publication.',
  'اقرأ منشورًا يشارك فيه فنان مسيرته أو تقنيته أو عمله. مرة واحدة لكل منشور.', 10, 30, 5),
 ('sponsored_video','Watch a sponsored video','Regarder une vidéo sponsorisée','شاهد فيديو مموّلًا',
  'Watch a clearly labelled sponsored video for the required time.',
  'Regardez une vidéo sponsorisée clairement identifiée pendant la durée demandée.',
  'شاهد فيديو مموّلًا معلَنًا بوضوح للمدة المطلوبة.', 1, 0, 100);

with p as (
  insert into public.incubation_programs (title, description)
  values ('Grow with ARTSART — Foundation', 'A five-stage journey from your first product to a recognisable creative business.')
  returning id
)
insert into public.incubation_milestones (program_id, stage, sort, title, description, check_kind)
select p.id, m.stage, m.sort, m.title, m.description, m.check_kind from p, (values
 (1,1,'Write your artist story','Describe what you make, how, and what makes it yours, in your profile biography.','has_bio'),
 (1,2,'Define who buys your work','Write down two kinds of customers and why they would choose your work.','manual'),
 (1,3,'Set your location','Choose how your location appears: workshop, city, service area or hidden.','has_location'),
 (2,1,'Publish three products','A small, well-presented range is easier to discover than one item.','has_3_products'),
 (2,2,'Show clear prices','Give a price, or say clearly that the price is on request.','has_priced_products'),
 (2,3,'Get your photos approved','Upload clear photos of real work; our team reviews each one.','has_approved_images'),
 (3,1,'Calculate your price','Materials + hours × your hourly rate + a margin. Use the pricing checklist.','manual'),
 (3,2,'Prepare your order routine','Decide how you confirm orders, take payment and hand over or deliver.','manual'),
 (4,1,'Publish your first story','Share your technique or journey in an artist post.','has_post'),
 (4,2,'Share your ARTSART profile','Add your profile link to your social media bio.','manual'),
 (5,1,'Receive your first order','An order placed through the marketplace.','has_order'),
 (5,2,'Review what sells','Look at your product views and orders and plan your next collection.','manual')
) as m(stage, sort, title, description, check_kind);

insert into public.learning_resources (stage, kind, title, summary, body) values
 (1,'guide','Finding what makes your work unique','Three questions to describe your creative identity.',
  E'1. What do you make, in one sentence a stranger understands?\n2. What do you do differently: material, technique, region, story?\n3. Who has already bought or admired your work, and why?\nWrite the answers, then turn them into the first three lines of your biography.'),
 (2,'checklist','Product photo checklist','Photograph your work so customers can trust what they see.',
  E'- Daylight near a window, no flash\n- Plain background (white wall, linen, wood)\n- One photo of the whole piece, one close-up of texture, one showing scale (a hand or a known object)\n- Show the real colours; do not use filters\n- Keep the phone level and the piece centred'),
 (2,'template','Product description template','A structure that answers buyers'' questions.',
  E'Title: what it is + main material (e.g. "Hand-painted ceramic bowl")\nWhat it is: one sentence.\nHow it is made: technique and time.\nSize and materials: exact dimensions, materials, care.\nDelivery: pickup, local delivery or shipping, and timing.'),
 (3,'checklist','Pricing checklist','Price so that each sale pays for your time.',
  E'Cost of materials\n+ hours spent × your hourly rate\n+ share of tools, energy and rent\n+ margin (often 20–40%)\nCompare with similar work, but do not undercut your own time.'),
 (3,'guide','Answering customers well','Simple habits that turn questions into orders.',
  E'Reply within 24 hours. Confirm price, timing and delivery in writing. Send a photo when an order is ready. Thank the customer and ask if they are happy.'),
 (4,'guide','Writing an artist post','Stories help customers connect with your work.',
  E'Pick one topic: a technique, a work in progress, a material, a tradition. Explain it in 5–10 sentences. End with what is coming next.'),
 (5,'guide','Reading your statistics','Use your numbers to decide what to make next.',
  E'Products with many views but no orders may need a better photo or a clearer price. Products that sell quickly may deserve variations. Check monthly, not daily.');

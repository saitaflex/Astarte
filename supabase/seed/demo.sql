-- DEMO CONTENT — NOT REAL ARTISTS. Every artist is flagged is_demo and named "Demo ·".
-- Applied only with `npm run db:migrate -- --demo`. Remove with `npm run db:demo-clear`.
-- Coordinates are public city centres (approximate-city privacy), not addresses.

insert into public.artist_profiles (id, slug, display_name, bio, primary_category, specialties, accepts_commissions, availability, approval_status, verification_status, contact, is_demo) values
 ('00000000-0000-4000-a000-000000000001','demo-nabeul-clay-studio','Demo · Nabeul Clay Studio','Sample profile. Hand-thrown and hand-painted ceramics in the Nabeul tradition: bowls, plates, tiles and vases with blue and green glazes.','pottery','{hand-painted ceramics,glazed tiles}',true,'accepting','approved','pending','[{"channel":"email","value":"studio@example.com","public":true}]',true),
 ('00000000-0000-4000-a000-000000000002','demo-kairouan-carpets','Demo · Kairouan Weaving House','Sample profile. Hand-knotted Kairouan carpets and flat-woven mergoum rugs made on traditional looms.','textiles','{hand-knotted carpets,mergoum,kilim}',true,'limited','approved','not_requested','[]',true),
 ('00000000-0000-4000-a000-000000000003','demo-sousse-oud-trio','Demo · Sousse Oud Trio','Sample profile. Live Tunisian malouf and contemporary oud for weddings, private events and recordings.','music','{oud,malouf,weddings}',true,'accepting','approved','verified','[{"channel":"instagram","value":"@demo.oud.trio","public":true}]',true),
 ('00000000-0000-4000-a000-000000000004','demo-tunis-oil-painter','Demo · Medina Light Painting','Sample profile. Oil and acrylic paintings of Tunis medina streets, doors and light. Original canvases and portrait commissions.','painting','{oil painting,portraits,cityscapes}',true,'accepting','approved','pending','[{"channel":"website","value":"https://example.com","public":true}]',true),
 ('00000000-0000-4000-a000-000000000005','demo-sfax-woodcraft','Demo · Sfax Olive Woodcraft','Sample profile. Olive-wood furniture, tables and kitchenware, finished by hand.','carpentry','{olive wood,tables,kitchenware}',true,'accepting','approved','not_requested','[]',true),
 ('00000000-0000-4000-a000-000000000006','demo-djerba-silver','Demo · Djerba Silver Atelier','Sample profile. Traditional silver jewelry from Djerba: khomsa pendants, filigree earrings and bridal pieces.','jewelry','{silver filigree,bridal jewelry}',true,'limited','approved','pending','[]',true),
 ('00000000-0000-4000-a000-000000000007','demo-sidi-bou-said-photo','Demo · Blue Door Photography','Sample profile. Editorial, wedding and product photography around Tunis and Sidi Bou Said.','photography','{weddings,product photography}',true,'accepting','approved','verified','[{"channel":"email","value":"photo@example.com","public":true}]',true),
 ('00000000-0000-4000-a000-000000000008','demo-bizerte-leather','Demo · Bizerte Leather Works','Sample profile. Hand-stitched leather bags, belts and babouche slippers.','leather','{bags,babouches}',false,'accepting','approved','not_requested','[]',true),
 ('00000000-0000-4000-a000-000000000009','demo-tozeur-design-studio','Demo · Oasis Design Studio','Sample profile. Graphic design and brand identity inspired by desert architecture and brick patterns of Tozeur.','graphic-design','{brand identity,posters}',true,'accepting','approved','not_requested','[]',true);

insert into public.artist_categories (artist_id, category_slug) values
 ('00000000-0000-4000-a000-000000000001','pottery'),('00000000-0000-4000-a000-000000000001','traditional-crafts'),
 ('00000000-0000-4000-a000-000000000002','textiles'),('00000000-0000-4000-a000-000000000002','traditional-crafts'),
 ('00000000-0000-4000-a000-000000000003','music'),('00000000-0000-4000-a000-000000000003','singing'),
 ('00000000-0000-4000-a000-000000000004','painting'),
 ('00000000-0000-4000-a000-000000000005','carpentry'),('00000000-0000-4000-a000-000000000005','furniture-design'),
 ('00000000-0000-4000-a000-000000000006','jewelry'),('00000000-0000-4000-a000-000000000006','traditional-crafts'),
 ('00000000-0000-4000-a000-000000000007','photography'),('00000000-0000-4000-a000-000000000007','videography'),
 ('00000000-0000-4000-a000-000000000008','leather'),('00000000-0000-4000-a000-000000000008','fashion'),
 ('00000000-0000-4000-a000-000000000009','graphic-design'),('00000000-0000-4000-a000-000000000009','studios');

insert into public.locations (artist_id, city, region, lat, lng, privacy, service_radius_km) values
 ('00000000-0000-4000-a000-000000000001','Nabeul','Nabeul',36.4561,10.7376,'approximate_city',null),
 ('00000000-0000-4000-a000-000000000002','Kairouan','Kairouan',35.6781,10.0963,'approximate_city',null),
 ('00000000-0000-4000-a000-000000000003','Sousse','Sousse',35.8256,10.6084,'service_area',80),
 ('00000000-0000-4000-a000-000000000004','Tunis','Tunis',36.8065,10.1815,'approximate_city',null),
 ('00000000-0000-4000-a000-000000000005','Sfax','Sfax',34.7406,10.7603,'approximate_city',null),
 ('00000000-0000-4000-a000-000000000006','Houmt Souk','Medenine',33.8752,10.8575,'approximate_city',null),
 ('00000000-0000-4000-a000-000000000007','Sidi Bou Said','Tunis',36.8687,10.3417,'approximate_city',null),
 ('00000000-0000-4000-a000-000000000008','Bizerte','Bizerte',37.2744,9.8739,'approximate_city',null),
 ('00000000-0000-4000-a000-000000000009','Tozeur','Tozeur',33.9197,8.1335,'hidden',null);

insert into public.products (id, artist_id, title, description, price_amount, availability, stock, materials, delivery_options, status, featured) values
 ('00000000-0000-4000-b000-000000000001','00000000-0000-4000-a000-000000000001','Hand-painted serving bowl','Large glazed bowl with traditional blue and green Nabeul motifs. About 30 cm wide.',85,'in_stock',6,'{clay,glaze}','{pickup,shipping}','published',true),
 ('00000000-0000-4000-b000-000000000002','00000000-0000-4000-a000-000000000001','Set of six decorative tiles','Hand-painted ceramic tiles for kitchens and walls. Home decoration.',null,'made_to_order',null,'{clay,glaze}','{pickup,shipping}','published',false),
 ('00000000-0000-4000-b000-000000000003','00000000-0000-4000-a000-000000000002','Mergoum wall rug','Flat-woven wool mergoum with geometric patterns. Living room decoration. 120 × 80 cm.',450,'in_stock',2,'{wool}','{pickup,local_delivery,shipping}','published',true),
 ('00000000-0000-4000-b000-000000000004','00000000-0000-4000-a000-000000000004','Original oil painting: Medina doorway','Oil on canvas, 60 × 80 cm. A blue medina door in afternoon light.',1200,'in_stock',1,'{oil paint,canvas}','{pickup,local_delivery}','published',true),
 ('00000000-0000-4000-b000-000000000005','00000000-0000-4000-a000-000000000005','Olive-wood dining table','Solid olive-wood table, made to the customer''s dimensions.',null,'made_to_order',null,'{olive wood}','{pickup,local_delivery}','published',false),
 ('00000000-0000-4000-b000-000000000006','00000000-0000-4000-a000-000000000005','Olive-wood salad bowl','Hand-turned salad bowl, food-safe finish.',60,'in_stock',10,'{olive wood}','{pickup,shipping}','published',false),
 ('00000000-0000-4000-b000-000000000007','00000000-0000-4000-a000-000000000006','Silver khomsa pendant','Traditional hand-made silver pendant.',140,'in_stock',4,'{silver}','{pickup,shipping}','published',true),
 ('00000000-0000-4000-b000-000000000008','00000000-0000-4000-a000-000000000008','Leather tote bag','Hand-stitched natural leather tote.',220,'unavailable',0,'{leather}','{pickup,shipping}','published',false);

insert into public.product_categories (product_id, category_slug) values
 ('00000000-0000-4000-b000-000000000001','pottery'),('00000000-0000-4000-b000-000000000002','pottery'),('00000000-0000-4000-b000-000000000002','traditional-crafts'),
 ('00000000-0000-4000-b000-000000000003','textiles'),('00000000-0000-4000-b000-000000000003','traditional-crafts'),
 ('00000000-0000-4000-b000-000000000004','painting'),('00000000-0000-4000-b000-000000000005','carpentry'),('00000000-0000-4000-b000-000000000005','furniture-design'),
 ('00000000-0000-4000-b000-000000000006','carpentry'),('00000000-0000-4000-b000-000000000007','jewelry'),('00000000-0000-4000-b000-000000000007','traditional-crafts'),
 ('00000000-0000-4000-b000-000000000008','leather'),('00000000-0000-4000-b000-000000000008','fashion');

insert into public.services (id, artist_id, title, description, price_from, pricing_note) values
 ('00000000-0000-4000-c000-000000000001','00000000-0000-4000-a000-000000000003','Live music for weddings','Oud trio for weddings and private celebrations, traditional and modern repertoire.',900,'Depends on duration and travel'),
 ('00000000-0000-4000-c000-000000000002','00000000-0000-4000-a000-000000000004','Portrait commission','Painted portrait from a sitting or photographs. The artist discusses format and style with you.',null,null),
 ('00000000-0000-4000-c000-000000000003','00000000-0000-4000-a000-000000000007','Wedding photography','Full-day wedding coverage with edited gallery.',1500,null),
 ('00000000-0000-4000-c000-000000000004','00000000-0000-4000-a000-000000000007','Product photography for artisans','Studio photos of your products for catalogues and online shops.',300,'Per session'),
 ('00000000-0000-4000-c000-000000000005','00000000-0000-4000-a000-000000000009','Brand identity','Logo, colours and printed materials for small businesses and festivals.',null,'Quoted per project');

insert into public.service_categories (service_id, category_slug) values
 ('00000000-0000-4000-c000-000000000001','music'),('00000000-0000-4000-c000-000000000001','singing'),('00000000-0000-4000-c000-000000000002','painting'),
 ('00000000-0000-4000-c000-000000000003','photography'),('00000000-0000-4000-c000-000000000004','photography'),('00000000-0000-4000-c000-000000000005','graphic-design');

insert into public.events (artist_id, slug, title, description, type, starts_at, ends_at, is_online, city, pricing_mode, price_amount, capacity, categories) values
 ('00000000-0000-4000-a000-000000000001','demo-pottery-workshop','Beginner pottery workshop','Three hours at the wheel. Clay and firing included.','workshop', date_trunc('day', now()) + interval '6 days 9 hours', date_trunc('day', now()) + interval '6 days 12 hours', false,'Nabeul','paid_pay_organizer',45,8,'{pottery}'),
 ('00000000-0000-4000-a000-000000000004','demo-medina-exhibition','Medina Light: open exhibition','New paintings shown in the studio. Free entry.','exhibition', date_trunc('day', now()) + interval '12 days 16 hours', date_trunc('day', now()) + interval '12 days 20 hours', false,'Tunis','free',null,null,'{painting}'),
 ('00000000-0000-4000-a000-000000000003','demo-malouf-evening','Malouf evening','An evening of Tunisian malouf.','performance', date_trunc('day', now()) + interval '9 days 19 hours', date_trunc('day', now()) + interval '9 days 21 hours', false,'Sousse','paid_pay_organizer',30,60,'{music}'),
 ('00000000-0000-4000-a000-000000000007','demo-online-photo-class','Photographing your crafts (online)','A 90-minute online class on lighting and framing your products with a phone.','masterclass', date_trunc('day', now()) + interval '4 days 17 hours', date_trunc('day', now()) + interval '4 days 18 hours 30 minutes', true,null,'free',null,40,'{photography}');

insert into public.artist_posts (artist_id, kind, title, body) values
 ('00000000-0000-4000-a000-000000000001','technique','How we paint Nabeul motifs (demo post)','Sample post. Each bowl is thrown on the wheel, dried for three days and fired once before painting. The blue and green motifs are painted freehand with oxide pigments, then the piece is glazed and fired a second time. A single bowl takes about a week from clay to shelf.'),
 ('00000000-0000-4000-a000-000000000002','journey','Three generations at the loom (demo post)','Sample post. Kairouan carpets are counted knot by knot. A 120 × 80 cm mergoum takes around three weeks on the loom. We dye part of our wool with plant colours and keep the traditional patterns while trying new colour combinations.');

insert into public.reward_offers (artist_id, title, description, conditions, points_cost, quantity, expires_at, status) values
 ('00000000-0000-4000-a000-000000000001','10% off a serving bowl (demo offer)','Sample offer from a demo studio.','One per customer. Show the code when ordering.',50,20, now() + interval '60 days','active'),
 ('00000000-0000-4000-a000-000000000007','Free 15-minute photo advice call (demo offer)','Sample offer from a demo studio.','Book by message with your code.',30,10, now() + interval '60 days','active');

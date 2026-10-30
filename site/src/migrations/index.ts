import * as migration_20261002_063454_initial from './20261002_063454_initial';
import * as migration_20261002_070938_report_and_resource_icons from './20261002_070938_report_and_resource_icons';
import * as migration_20261002_072548_territories_map from './20261002_072548_territories_map';
import * as migration_20261002_074726_home_evacuation from './20261002_074726_home_evacuation';
import * as migration_20261002_081925_navigation from './20261002_081925_navigation';
import * as migration_20261002_083239_localized_chips from './20261002_083239_localized_chips';
import * as migration_20261002_085609_videos from './20261002_085609_videos';
import * as migration_20261002_091402_trash from './20261002_091402_trash';
import * as migration_20261002_121436_has_english from './20261002_121436_has_english';
import * as migration_20261005_103523_visits from './20261005_103523_visits';
import * as migration_20261005_110019_seo from './20261005_110019_seo';
import * as migration_20261005_111047_resources from './20261005_111047_resources';
import * as migration_20261005_111134_home_resources_moved from './20261005_111134_home_resources_moved';
import * as migration_20261005_124910_contacts_socials from './20261005_124910_contacts_socials';
import * as migration_20261007_085753_search_text from './20261007_085753_search_text';
import * as migration_20261007_105115_news_topics from './20261007_105115_news_topics';
import * as migration_20261007_114553_news_categories from './20261007_114553_news_categories';
import * as migration_20261007_115506_remove_news_tag from './20261007_115506_remove_news_tag';
import * as migration_20261007_121728_speed_indexes from './20261007_121728_speed_indexes';
import * as migration_20261008_121239_hotline_1648 from './20261008_121239_hotline_1648';
import * as migration_20261008_124212_territories_list_button from './20261008_124212_territories_list_button';
import * as migration_20261008_132515_fix_bot_name from './20261008_132515_fix_bot_name';
import * as migration_20261008_132809_territories_card_link from './20261008_132809_territories_card_link';
import * as migration_20261009_060641_visits_country from './20261009_060641_visits_country';
import * as migration_20261009_101538_stats_sheet from './20261009_101538_stats_sheet';
import * as migration_20261009_111443_annual_report_sheet from './20261009_111443_annual_report_sheet';
import * as migration_20261009_112310_territories_sheet from './20261009_112310_territories_sheet';
import * as migration_20261015_105811_media_trash from './20261015_105811_media_trash';
import * as migration_20261015_111116_image_sizes_webp from './20261015_111116_image_sizes_webp';
import * as migration_20261019_152536_localized_home_links from './20261019_152536_localized_home_links';
import * as migration_20261029_094413_home_cards_more from './20261029_094413_home_cards_more';
import * as migration_20261029_100157_home_hero_links from './20261029_100157_home_hero_links';
import * as migration_20261029_101500_diyalnist_digital_systems from './20261029_101500_diyalnist_digital_systems';
import * as migration_20261030_120000_nav_vacancies_about from './20261030_120000_nav_vacancies_about';
import * as migration_20261030_180000_home_chip_links from './20261030_180000_home_chip_links';
import * as migration_20261030_130000_diyalnist_systems_up from './20261030_130000_diyalnist_systems_up';
import * as migration_20261030_140000_nav_digital_recovery from './20261030_140000_nav_digital_recovery';
import * as migration_20261030_150000_nav_digital_systems_name from './20261030_150000_nav_digital_systems_name';
import * as migration_20261030_160000_digital_systems_pages from './20261030_160000_digital_systems_pages';
import * as migration_20261030_170000_home_hero_no_text from './20261030_170000_home_hero_no_text';

export const migrations = [
  {
    up: migration_20261002_063454_initial.up,
    down: migration_20261002_063454_initial.down,
    name: '20261002_063454_initial',
  },
  {
    up: migration_20261002_070938_report_and_resource_icons.up,
    down: migration_20261002_070938_report_and_resource_icons.down,
    name: '20261002_070938_report_and_resource_icons',
  },
  {
    up: migration_20261002_072548_territories_map.up,
    down: migration_20261002_072548_territories_map.down,
    name: '20261002_072548_territories_map',
  },
  {
    up: migration_20261002_074726_home_evacuation.up,
    down: migration_20261002_074726_home_evacuation.down,
    name: '20261002_074726_home_evacuation',
  },
  {
    up: migration_20261002_081925_navigation.up,
    down: migration_20261002_081925_navigation.down,
    name: '20261002_081925_navigation',
  },
  {
    up: migration_20261002_083239_localized_chips.up,
    down: migration_20261002_083239_localized_chips.down,
    name: '20261002_083239_localized_chips',
  },
  {
    up: migration_20261002_085609_videos.up,
    down: migration_20261002_085609_videos.down,
    name: '20261002_085609_videos',
  },
  {
    up: migration_20261002_091402_trash.up,
    down: migration_20261002_091402_trash.down,
    name: '20261002_091402_trash',
  },
  {
    up: migration_20261002_121436_has_english.up,
    down: migration_20261002_121436_has_english.down,
    name: '20261002_121436_has_english',
  },
  {
    up: migration_20261005_103523_visits.up,
    down: migration_20261005_103523_visits.down,
    name: '20261005_103523_visits',
  },
  {
    up: migration_20261005_110019_seo.up,
    down: migration_20261005_110019_seo.down,
    name: '20261005_110019_seo',
  },
  {
    up: migration_20261005_111047_resources.up,
    down: migration_20261005_111047_resources.down,
    name: '20261005_111047_resources',
  },
  {
    up: migration_20261005_111134_home_resources_moved.up,
    down: migration_20261005_111134_home_resources_moved.down,
    name: '20261005_111134_home_resources_moved',
  },
  {
    up: migration_20261005_124910_contacts_socials.up,
    down: migration_20261005_124910_contacts_socials.down,
    name: '20261005_124910_contacts_socials',
  },
  {
    up: migration_20261007_085753_search_text.up,
    down: migration_20261007_085753_search_text.down,
    name: '20261007_085753_search_text',
  },
  {
    up: migration_20261007_105115_news_topics.up,
    down: migration_20261007_105115_news_topics.down,
    name: '20261007_105115_news_topics',
  },
  {
    up: migration_20261007_114553_news_categories.up,
    down: migration_20261007_114553_news_categories.down,
    name: '20261007_114553_news_categories',
  },
  {
    up: migration_20261007_115506_remove_news_tag.up,
    down: migration_20261007_115506_remove_news_tag.down,
    name: '20261007_115506_remove_news_tag',
  },
  {
    up: migration_20261007_121728_speed_indexes.up,
    down: migration_20261007_121728_speed_indexes.down,
    name: '20261007_121728_speed_indexes',
  },
  {
    up: migration_20261008_121239_hotline_1648.up,
    down: migration_20261008_121239_hotline_1648.down,
    name: '20261008_121239_hotline_1648',
  },
  {
    up: migration_20261008_124212_territories_list_button.up,
    down: migration_20261008_124212_territories_list_button.down,
    name: '20261008_124212_territories_list_button',
  },
  {
    up: migration_20261008_132515_fix_bot_name.up,
    down: migration_20261008_132515_fix_bot_name.down,
    name: '20261008_132515_fix_bot_name',
  },
  {
    up: migration_20261008_132809_territories_card_link.up,
    down: migration_20261008_132809_territories_card_link.down,
    name: '20261008_132809_territories_card_link',
  },
  {
    up: migration_20261009_060641_visits_country.up,
    down: migration_20261009_060641_visits_country.down,
    name: '20261009_060641_visits_country',
  },
  {
    up: migration_20261009_101538_stats_sheet.up,
    down: migration_20261009_101538_stats_sheet.down,
    name: '20261009_101538_stats_sheet',
  },
  {
    up: migration_20261009_111443_annual_report_sheet.up,
    down: migration_20261009_111443_annual_report_sheet.down,
    name: '20261009_111443_annual_report_sheet',
  },
  {
    up: migration_20261009_112310_territories_sheet.up,
    down: migration_20261009_112310_territories_sheet.down,
    name: '20261009_112310_territories_sheet',
  },
  {
    up: migration_20261015_105811_media_trash.up,
    down: migration_20261015_105811_media_trash.down,
    name: '20261015_105811_media_trash',
  },
  {
    up: migration_20261015_111116_image_sizes_webp.up,
    down: migration_20261015_111116_image_sizes_webp.down,
    name: '20261015_111116_image_sizes_webp',
  },
  {
    up: migration_20261019_152536_localized_home_links.up,
    down: migration_20261019_152536_localized_home_links.down,
    name: '20261019_152536_localized_home_links',
  },
  {
    up: migration_20261029_094413_home_cards_more.up,
    down: migration_20261029_094413_home_cards_more.down,
    name: '20261029_094413_home_cards_more',
  },
  {
    up: migration_20261029_100157_home_hero_links.up,
    down: migration_20261029_100157_home_hero_links.down,
    name: '20261029_100157_home_hero_links',
  },
  {
    up: migration_20261029_101500_diyalnist_digital_systems.up,
    down: migration_20261029_101500_diyalnist_digital_systems.down,
    name: '20261029_101500_diyalnist_digital_systems',
  },
  {
    up: migration_20261030_120000_nav_vacancies_about.up,
    down: migration_20261030_120000_nav_vacancies_about.down,
    name: '20261030_120000_nav_vacancies_about',
  },
  {
    up: migration_20261030_180000_home_chip_links.up,
    down: migration_20261030_180000_home_chip_links.down,
    name: '20261030_180000_home_chip_links',
  },
  {
    up: migration_20261030_130000_diyalnist_systems_up.up,
    down: migration_20261030_130000_diyalnist_systems_up.down,
    name: '20261030_130000_diyalnist_systems_up',
  },
  {
    up: migration_20261030_140000_nav_digital_recovery.up,
    down: migration_20261030_140000_nav_digital_recovery.down,
    name: '20261030_140000_nav_digital_recovery',
  },
  {
    up: migration_20261030_150000_nav_digital_systems_name.up,
    down: migration_20261030_150000_nav_digital_systems_name.down,
    name: '20261030_150000_nav_digital_systems_name',
  },
  {
    up: migration_20261030_160000_digital_systems_pages.up,
    down: migration_20261030_160000_digital_systems_pages.down,
    name: '20261030_160000_digital_systems_pages',
  },
  {
    up: migration_20261030_170000_home_hero_no_text.up,
    down: migration_20261030_170000_home_hero_no_text.down,
    name: '20261030_170000_home_hero_no_text'
  },
];

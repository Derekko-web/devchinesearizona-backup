<?php
/**
 * Plugin Name: CA Trust Pages
 * Description: Adds trust-focused pages and footer links for ChineseArizona.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'CA_TRUST_PAGES_VERSION', '1.0.0' );

add_action( 'init', 'ca_trust_bootstrap_pages', 20 );
add_action( 'wp_enqueue_scripts', 'ca_trust_enqueue_styles' );
add_action( 'kadence_before_footer', 'ca_trust_render_footer_panel', 5 );
add_action( 'template_redirect', 'ca_trust_redirect_legacy_terms' );

/**
 * Provision pages and menu links once.
 */
function ca_trust_bootstrap_pages() {
	if ( get_option( 'ca_trust_pages_version' ) === CA_TRUST_PAGES_VERSION ) {
		return;
	}

	$page_ids = array();
	$specs    = ca_trust_page_specs();

	foreach ( $specs as $key => $spec ) {
		$page_ids[ $key ] = ca_trust_ensure_page( $key, $spec );
	}

	ca_trust_ensure_primary_menu_links( $page_ids, $specs );

	update_option( 'ca_trust_pages_version', CA_TRUST_PAGES_VERSION, false );
}

/**
 * Define the trust pages we want on the site.
 *
 * @return array<string, array<string, mixed>>
 */
function ca_trust_page_specs() {
	return array(
		'about'   => array(
			'title'            => 'About',
			'slug'             => 'about',
			'menu_label'       => 'About',
			'panel_label'      => 'About',
			'content_callback' => 'ca_trust_about_content',
		),
		'contact' => array(
			'title'            => 'Contact',
			'slug'             => 'contact',
			'menu_label'       => 'Contact',
			'panel_label'      => 'Contact',
			'content_callback' => 'ca_trust_contact_content',
		),
		'help'    => array(
			'title'            => 'Help',
			'slug'             => 'help',
			'menu_label'       => 'Help',
			'panel_label'      => 'Help',
			'content_callback' => 'ca_trust_help_content',
		),
		'privacy' => array(
			'title'            => 'Privacy Policy',
			'slug'             => 'privacy-policy',
			'panel_label'      => 'Privacy Policy',
			'content_callback' => 'ca_trust_privacy_content',
		),
		'terms'   => array(
			'title'            => 'Terms of Service',
			'slug'             => 'terms-of-service',
			'aliases'          => array( 'terms-and-conditions' ),
			'panel_label'      => 'Terms of Service',
			'content_callback' => 'ca_trust_terms_content',
		),
	);
}

/**
 * Create or upgrade a page in-place when it is missing or still placeholder content.
 *
 * @param string $key  Internal page key.
 * @param array  $spec Page definition.
 * @return int
 */
function ca_trust_ensure_page( $key, array $spec ) {
	$page    = ca_trust_find_page( $spec );
	$content = call_user_func( $spec['content_callback'] );

	if ( ! $page ) {
		$post_id = wp_insert_post(
			wp_slash(
				array(
					'post_type'    => 'page',
					'post_status'  => 'publish',
					'post_title'   => $spec['title'],
					'post_name'    => $spec['slug'],
					'post_content' => $content,
				)
			),
			true
		);

		if ( is_wp_error( $post_id ) ) {
			return 0;
		}

		update_post_meta( $post_id, '_ca_trust_page', $key );

		return (int) $post_id;
	}

	$managed        = get_post_meta( $page->ID, '_ca_trust_page', true ) === $key;
	$should_refresh = ca_trust_should_refresh_page( $key, $page );
	$update         = array(
		'ID'          => $page->ID,
		'post_status' => 'publish',
	);

	if ( $managed || $should_refresh ) {
		if ( $page->post_title !== $spec['title'] ) {
			$update['post_title'] = $spec['title'];
		}
		if ( $page->post_name !== $spec['slug'] ) {
			$update['post_name'] = $spec['slug'];
		}
	}

	if ( $should_refresh ) {
		$update['post_content'] = $content;
	}

	if ( count( $update ) > 2 || 'publish' !== $page->post_status ) {
		wp_update_post( wp_slash( $update ) );
	}

	update_post_meta( $page->ID, '_ca_trust_page', $key );

	return (int) $page->ID;
}

/**
 * Find a page by slug or legacy alias.
 *
 * @param array $spec Page definition.
 * @return WP_Post|null
 */
function ca_trust_find_page( array $spec ) {
	$slugs = array( $spec['slug'] );

	if ( ! empty( $spec['aliases'] ) && is_array( $spec['aliases'] ) ) {
		$slugs = array_merge( $slugs, $spec['aliases'] );
	}

	foreach ( $slugs as $slug ) {
		$page = get_page_by_path( $slug, OBJECT, 'page' );
		if ( $page instanceof WP_Post ) {
			return $page;
		}
	}

	return null;
}

/**
 * Only overwrite pages that are clearly placeholders or default boilerplate.
 *
 * @param string  $key  Internal page key.
 * @param WP_Post $page Page object.
 * @return bool
 */
function ca_trust_should_refresh_page( $key, WP_Post $page ) {
	$content    = trim( (string) $page->post_content );
	$normalized = strtolower( wp_strip_all_tags( $content ) );

	if ( '' === $normalized ) {
		return true;
	}

	switch ( $key ) {
		case 'contact':
			return str_contains( $normalized, 'contact page coming soon' );

		case 'help':
		case 'about':
			return str_contains( $normalized, 'coming soon' );

		case 'privacy':
			return 'draft' === $page->post_status || str_contains( $content, 'privacy-policy-tutorial' ) || str_contains( $normalized, 'suggested text:' );

		case 'terms':
			return str_contains( $normalized, 'enter your site terms and conditions here' );
	}

	return false;
}

/**
 * Add About and Help to the existing primary menu.
 *
 * @param array $page_ids Page ids keyed by trust page key.
 * @param array $specs    Page definitions.
 */
function ca_trust_ensure_primary_menu_links( array $page_ids, array $specs ) {
	$theme_mods = get_option( 'theme_mods_' . get_stylesheet(), array() );
	$locations  = isset( $theme_mods['nav_menu_locations'] ) && is_array( $theme_mods['nav_menu_locations'] )
		? $theme_mods['nav_menu_locations']
		: array();
	$menu_id    = isset( $locations['primary'] ) ? (int) $locations['primary'] : 0;

	if ( ! $menu_id ) {
		return;
	}

	$items       = wp_get_nav_menu_items( $menu_id );
	$items       = is_array( $items ) ? $items : array();
	$object_ids  = array();
	$menu_order  = 0;
	$target_keys = array( 'about', 'help' );

	foreach ( $items as $item ) {
		$object_ids[ (int) $item->object_id ] = true;
		$menu_order                           = max( $menu_order, (int) $item->menu_order );
	}

	foreach ( $target_keys as $key ) {
		$page_id = isset( $page_ids[ $key ] ) ? (int) $page_ids[ $key ] : 0;

		if ( ! $page_id || isset( $object_ids[ $page_id ] ) ) {
			continue;
		}

		++$menu_order;

		wp_update_nav_menu_item(
			$menu_id,
			0,
			array(
				'menu-item-title'     => $specs[ $key ]['menu_label'],
				'menu-item-object-id' => $page_id,
				'menu-item-object'    => 'page',
				'menu-item-type'      => 'post_type',
				'menu-item-status'    => 'publish',
				'menu-item-position'  => $menu_order,
				'menu-item-parent-id' => 0,
			)
		);
	}
}

/**
 * Render a visible trust panel above the footer.
 */
function ca_trust_render_footer_panel() {
	if ( is_admin() || wp_doing_ajax() ) {
		return;
	}

	$specs = ca_trust_page_specs();
	$keys  = array( 'about', 'contact', 'help', 'privacy', 'terms' );
	$links = array();

	foreach ( $keys as $key ) {
		$url = ca_trust_page_url( $key );
		if ( $url ) {
			$links[] = array(
				'label' => $specs[ $key ]['panel_label'],
				'url'   => $url,
			);
		}
	}

	if ( empty( $links ) ) {
		return;
	}
	?>
	<section class="ca-trust-panel" aria-labelledby="ca-trust-panel-title">
		<div class="site-container">
			<div class="ca-trust-panel__inner">
				<div class="ca-trust-panel__copy">
					<p class="ca-trust-panel__eyebrow">Trust &amp; Help</p>
					<h2 id="ca-trust-panel-title">Questions about the directory, privacy, or how to reach us?</h2>
					<p>These pages explain who ChineseArizona is for, how to get support, and what visitors should know before submitting or using listings.</p>
				</div>
				<nav class="ca-trust-panel__links" aria-label="Trust pages">
					<?php foreach ( $links as $link ) : ?>
						<a class="ca-trust-panel__link" href="<?php echo esc_url( $link['url'] ); ?>">
							<?php echo esc_html( $link['label'] ); ?>
						</a>
					<?php endforeach; ?>
				</nav>
			</div>
		</div>
	</section>
	<?php
}

/**
 * Enqueue shared styles for the trust panel and page layouts.
 */
function ca_trust_enqueue_styles() {
	if ( is_admin() ) {
		return;
	}

	wp_register_style( 'ca-trust-pages', false, array(), CA_TRUST_PAGES_VERSION );
	wp_enqueue_style( 'ca-trust-pages' );
	wp_add_inline_style( 'ca-trust-pages', ca_trust_styles() );
}

/**
 * Redirect the old terms slug to the new one.
 */
function ca_trust_redirect_legacy_terms() {
	if ( is_admin() || headers_sent() || empty( $_SERVER['REQUEST_URI'] ) ) {
		return;
	}

	$path = wp_parse_url( sanitize_text_field( wp_unslash( $_SERVER['REQUEST_URI'] ) ), PHP_URL_PATH );

	if ( ! $path ) {
		return;
	}

	if ( '/terms-and-conditions/' === trailingslashit( $path ) ) {
		wp_safe_redirect( home_url( '/terms-of-service/' ), 301 );
		exit;
	}
}

/**
 * Resolve a trust page url.
 *
 * @param string $key Internal page key.
 * @return string
 */
function ca_trust_page_url( $key ) {
	$specs = ca_trust_page_specs();

	if ( empty( $specs[ $key ] ) ) {
		return '';
	}

	$page = ca_trust_find_page( $specs[ $key ] );

	if ( $page ) {
		return (string) get_permalink( $page );
	}

	return (string) home_url( '/' . $specs[ $key ]['slug'] . '/' );
}

/**
 * Shared page styles.
 *
 * @return string
 */
function ca_trust_styles() {
	return '
.ca-trust-panel {
	padding: 0 0 2rem;
}
.ca-trust-panel__inner {
	background: linear-gradient(135deg, var(--global-palette10, #ccfbf1), #ffffff);
	border: 1px solid var(--global-palette7, #e2e8f0);
	border-radius: 24px;
	box-shadow: 0 24px 50px -34px rgba(15, 23, 42, 0.28);
	display: grid;
	gap: 1.5rem;
	padding: 2rem;
}
.ca-trust-panel__eyebrow,
.ca-page-kicker {
	color: var(--global-palette1, #0f766e);
	font-size: 0.82rem;
	font-weight: 700;
	letter-spacing: 0.08em;
	margin: 0 0 0.5rem;
	text-transform: uppercase;
}
.ca-trust-panel__copy h2,
.ca-page-section h2,
.ca-card h2 {
	margin-bottom: 0.75rem;
}
.ca-trust-panel__copy p:last-child,
.ca-card p:last-child,
.ca-page-section p:last-child {
	margin-bottom: 0;
}
.ca-trust-panel__links {
	display: flex;
	flex-wrap: wrap;
	gap: 0.75rem;
}
.ca-trust-panel__link {
	background: rgba(255, 255, 255, 0.92);
	border: 1px solid rgba(15, 118, 110, 0.14);
	border-radius: 999px;
	color: var(--global-palette3, #0f172a);
	font-weight: 600;
	padding: 0.8rem 1rem;
	text-decoration: none;
}
.ca-trust-panel__link:hover,
.ca-trust-panel__link:focus {
	background: var(--global-palette1, #0f766e);
	color: #ffffff;
	text-decoration: none;
}
.ca-trust-page {
	display: grid;
	gap: 1.5rem;
}
.ca-page-intro {
	background: linear-gradient(135deg, rgba(204, 251, 241, 0.45), #ffffff);
	border: 1px solid var(--global-palette7, #e2e8f0);
	border-radius: 20px;
	padding: 1.75rem;
}
.ca-page-intro p:last-child {
	margin-bottom: 0;
}
.ca-card-grid {
	display: grid;
	gap: 1rem;
	grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}
.ca-card,
.ca-page-section,
.ca-faq details {
	background: #ffffff;
	border: 1px solid var(--global-palette7, #e2e8f0);
	border-radius: 18px;
	box-shadow: 0 18px 40px -34px rgba(15, 23, 42, 0.18);
	padding: 1.4rem;
}
.ca-page-columns {
	display: grid;
	gap: 1rem;
	grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}
.ca-list {
	margin: 0;
	padding-left: 1.1rem;
}
.ca-list li + li {
	margin-top: 0.6rem;
}
.ca-faq {
	display: grid;
	gap: 0.85rem;
}
.ca-faq summary {
	cursor: pointer;
	font-weight: 700;
}
.ca-faq summary + p,
.ca-faq summary + div {
	margin-top: 0.85rem;
}
.ca-link-row {
	display: flex;
	flex-wrap: wrap;
	gap: 0.75rem;
	margin-top: 1rem;
}
.ca-link-chip {
	background: var(--global-palette8, #f8fafc);
	border: 1px solid var(--global-palette7, #e2e8f0);
	border-radius: 999px;
	display: inline-flex;
	font-weight: 600;
	padding: 0.7rem 0.95rem;
	text-decoration: none;
}
@media all and (max-width: 767px) {
	.ca-trust-panel__inner,
	.ca-page-intro,
	.ca-card,
	.ca-page-section,
	.ca-faq details {
		padding: 1.25rem;
	}
}
';
}

/**
 * About page content.
 *
 * @return string
 */
function ca_trust_about_content() {
	$directory_url   = esc_url( home_url( '/directory/' ) );
	$add_listing_url = esc_url( home_url( '/add-listing/' ) );
	$advertise_url   = esc_url( home_url( '/advertise/' ) );
	$contact_url     = esc_url( home_url( '/contact/' ) );

	ob_start();
	?>
	<div class="ca-trust-page">
		<div class="ca-page-intro">
			<p class="ca-page-kicker">About ChineseArizona</p>
			<p>ChineseArizona is a local directory built to help people discover useful businesses, services, and community resources for Arizona's Chinese community in one cleaner, easier-to-navigate place.</p>
			<p>The goal is practical: make it faster to find the right restaurant, school, doctor, attorney, real estate professional, service provider, or community organization without digging through outdated listings.</p>
		</div>

		<div class="ca-card-grid">
			<section class="ca-card">
				<h2>What the site does</h2>
				<p>We organize directory listings and supporting pages so visitors can browse local options by category, location, and need.</p>
			</section>
			<section class="ca-card">
				<h2>Who it is for</h2>
				<p>Residents, families, newcomers, business owners, and community members looking for trusted local information in Arizona.</p>
			</section>
			<section class="ca-card">
				<h2>How it stays useful</h2>
				<p>Listings can be added, updated, and improved over time. Feedback from business owners and visitors helps keep the directory more accurate and more helpful.</p>
			</section>
		</div>

		<div class="ca-page-columns">
			<section class="ca-page-section">
				<h2>What to expect</h2>
				<ul class="ca-list">
					<li>A directory focused on local relevance, not just volume.</li>
					<li>Pages designed to be easy to scan on desktop and mobile.</li>
					<li>Clear ways to submit listings, ask questions, or report incorrect information.</li>
				</ul>
			</section>
			<section class="ca-page-section">
				<h2>How to participate</h2>
				<ul class="ca-list">
					<li>Browse the <a href="<?php echo $directory_url; ?>">directory</a> to explore current listings.</li>
					<li>Use <a href="<?php echo $add_listing_url; ?>">Add Listing</a> if you want to submit a business or organization.</li>
					<li>Visit <a href="<?php echo $advertise_url; ?>">Advertise</a> for sponsorship or promotion opportunities.</li>
					<li>Reach out through the <a href="<?php echo $contact_url; ?>">contact page</a> if you need help.</li>
				</ul>
			</section>
		</div>
	</div>
	<?php
	return trim( ob_get_clean() );
}

/**
 * Contact page content.
 *
 * @return string
 */
function ca_trust_contact_content() {
	$admin_email     = sanitize_email( get_option( 'admin_email' ) );
	$mailto          = esc_url( 'mailto:' . $admin_email );
	$add_listing_url = esc_url( home_url( '/add-listing/' ) );
	$advertise_url   = esc_url( home_url( '/advertise/' ) );

	ob_start();
	?>
	<div class="ca-trust-page">
		<div class="ca-page-intro">
			<p class="ca-page-kicker">Contact</p>
			<p>For listing corrections, general questions, business inquiries, or partnership ideas, email <a href="<?php echo $mailto; ?>"><?php echo esc_html( $admin_email ); ?></a>.</p>
			<p>Including the relevant business name, page URL, and requested change will help your message get handled faster.</p>
		</div>

		<div class="ca-page-columns">
			<section class="ca-page-section">
				<h2>Common reasons to reach out</h2>
				<ul class="ca-list">
					<li>Report inaccurate listing information.</li>
					<li>Ask about directory submissions or missing categories.</li>
					<li>Share community updates or partnership ideas.</li>
					<li>Request help with a business listing or page edit.</li>
				</ul>
			</section>
			<section class="ca-page-section">
				<h2>Useful shortcuts</h2>
				<p>If you already know what you need, start with one of these pages:</p>
				<div class="ca-link-row">
					<a class="ca-link-chip" href="<?php echo $add_listing_url; ?>">Add Listing</a>
					<a class="ca-link-chip" href="<?php echo $advertise_url; ?>">Advertise</a>
				</div>
			</section>
		</div>
	</div>
	<?php
	return trim( ob_get_clean() );
}

/**
 * Help page content.
 *
 * @return string
 */
function ca_trust_help_content() {
	$add_listing_url = esc_url( home_url( '/add-listing/' ) );
	$advertise_url   = esc_url( home_url( '/advertise/' ) );
	$contact_url     = esc_url( home_url( '/contact/' ) );
	$privacy_url     = esc_url( home_url( '/privacy-policy/' ) );
	$terms_url       = esc_url( home_url( '/terms-of-service/' ) );

	ob_start();
	?>
	<div class="ca-trust-page">
		<div class="ca-page-intro">
			<p class="ca-page-kicker">Help</p>
			<p>This page answers the most common questions about how the directory works, how to request changes, and where to go if you need support.</p>
		</div>

		<div class="ca-faq">
			<details open>
				<summary>How do I submit a new listing?</summary>
				<p>Use the <a href="<?php echo $add_listing_url; ?>">Add Listing</a> page and provide as much complete information as you can, including category, location, and contact details.</p>
			</details>
			<details>
				<summary>How do I fix incorrect information?</summary>
				<p>Visit the <a href="<?php echo $contact_url; ?>">Contact</a> page and include the listing name, page URL, and the exact correction you want made.</p>
			</details>
			<details>
				<summary>Does ChineseArizona guarantee every listing?</summary>
				<p>No. Listings may come from business owners, community members, or directory submissions. Visitors should still use their own judgment before making decisions or purchases.</p>
			</details>
			<details>
				<summary>How do advertising or featured placements work?</summary>
				<p>Use the <a href="<?php echo $advertise_url; ?>">Advertise</a> page or contact the site directly for promotional opportunities.</p>
			</details>
			<details>
				<summary>Where can I read the site's privacy and usage policies?</summary>
				<div>
					<p>The site policies are available here:</p>
					<div class="ca-link-row">
						<a class="ca-link-chip" href="<?php echo $privacy_url; ?>">Privacy Policy</a>
						<a class="ca-link-chip" href="<?php echo $terms_url; ?>">Terms of Service</a>
					</div>
				</div>
			</details>
		</div>
	</div>
	<?php
	return trim( ob_get_clean() );
}

/**
 * Privacy policy page content.
 *
 * @return string
 */
function ca_trust_privacy_content() {
	$contact_url = esc_url( home_url( '/contact/' ) );

	ob_start();
	?>
	<div class="ca-trust-page">
		<div class="ca-page-intro">
			<p class="ca-page-kicker">Privacy Policy</p>
			<p>This Privacy Policy explains what information ChineseArizona may collect, how that information may be used, and what choices visitors have when using the site.</p>
		</div>

		<section class="ca-page-section">
			<h2>Information we may collect</h2>
			<ul class="ca-list">
				<li>Basic technical data such as browser type, IP address, and device information collected through standard server logs.</li>
				<li>Information you choose to submit, such as listing details, business information, email messages, or other contact information.</li>
				<li>Cookies or similar technologies used for core site functionality, preferences, and security.</li>
			</ul>
		</section>

		<section class="ca-page-section">
			<h2>How information may be used</h2>
			<ul class="ca-list">
				<li>Operate, maintain, and improve the directory.</li>
				<li>Review, publish, edit, or respond to listing submissions and support requests.</li>
				<li>Prevent spam, abuse, fraud, or technical misuse of the site.</li>
				<li>Comply with legal obligations when required.</li>
			</ul>
		</section>

		<section class="ca-page-section">
			<h2>Sharing and retention</h2>
			<p>ChineseArizona does not sell personal information. Information may be shared with service providers or hosting partners when needed to run the site, maintain security, or respond to lawful requests.</p>
			<p>Information is retained only as long as reasonably needed for site operations, recordkeeping, moderation, or legal purposes.</p>
		</section>

		<section class="ca-page-section">
			<h2>Your choices</h2>
			<p>You can avoid submitting personal information through forms or email, request updates to listing-related information, or contact the site with privacy-related questions.</p>
			<p>For questions about this policy, use the <a href="<?php echo $contact_url; ?>">Contact</a> page.</p>
		</section>
	</div>
	<?php
	return trim( ob_get_clean() );
}

/**
 * Terms page content.
 *
 * @return string
 */
function ca_trust_terms_content() {
	$contact_url = esc_url( home_url( '/contact/' ) );

	ob_start();
	?>
	<div class="ca-trust-page">
		<div class="ca-page-intro">
			<p class="ca-page-kicker">Terms of Service</p>
			<p>These Terms of Service govern your use of ChineseArizona. By accessing or using the site, you agree to use it lawfully and respectfully.</p>
		</div>

		<section class="ca-page-section">
			<h2>Directory information</h2>
			<p>ChineseArizona provides business and community listing information for general informational purposes. Listings may be user-submitted or edited for clarity, organization, and site standards.</p>
			<p>The site does not guarantee that every listing is complete, current, or suitable for your specific needs.</p>
		</section>

		<section class="ca-page-section">
			<h2>Acceptable use</h2>
			<ul class="ca-list">
				<li>Do not submit false, misleading, unlawful, abusive, or infringing content.</li>
				<li>Do not interfere with the site's operation, security, or availability.</li>
				<li>Do not scrape, copy, or reuse site content in a way that violates applicable law or these terms.</li>
			</ul>
		</section>

		<section class="ca-page-section">
			<h2>Submissions and moderation</h2>
			<p>If you submit a listing or other material, you represent that you have the right to share it and that it is accurate to the best of your knowledge.</p>
			<p>ChineseArizona may review, edit, reject, remove, or reorganize submissions at its discretion.</p>
		</section>

		<section class="ca-page-section">
			<h2>No warranties and limited liability</h2>
			<p>The site is provided on an "as is" and "as available" basis. ChineseArizona disclaims warranties to the fullest extent permitted by law.</p>
			<p>ChineseArizona is not liable for decisions, transactions, or damages arising from use of the site, third-party listings, or external links.</p>
		</section>

		<section class="ca-page-section">
			<h2>Changes and contact</h2>
			<p>These terms may be updated from time to time. Continued use of the site after changes are posted means you accept the updated terms.</p>
			<p>If you have questions about these terms, use the <a href="<?php echo $contact_url; ?>">Contact</a> page.</p>
		</section>
	</div>
	<?php
	return trim( ob_get_clean() );
}

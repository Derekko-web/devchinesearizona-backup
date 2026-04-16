<?php
/**
 * Plugin Name: CA Directory Import
 * Description: Imports the live ChineseArizona directory dataset from the local dev export into GeoDirectory.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const CA_DIRECTORY_IMPORT_META_SOURCE_ID          = '_ca_directory_source_id';
const CA_DIRECTORY_IMPORT_META_SOURCE_SLUG        = '_ca_directory_source_slug';
const CA_DIRECTORY_IMPORT_META_SOURCE_STATUS      = '_ca_directory_source_status';
const CA_DIRECTORY_IMPORT_META_SOURCE_LAST_UPDATE = '_ca_directory_source_last_updated';
const CA_DIRECTORY_IMPORT_META_IMPORTED_AT        = '_ca_directory_imported_at';
const CA_DIRECTORY_IMPORT_META_PHONE              = '_ca_directory_phone';
const CA_DIRECTORY_IMPORT_META_EMAIL              = '_ca_directory_email';
const CA_DIRECTORY_IMPORT_META_WEBSITE            = '_ca_directory_website';
const CA_DIRECTORY_IMPORT_SOURCE_PATH             = '/var/www/dev.chinesearizona.com/web/src/data/generated-directory-businesses.json';

add_action( 'admin_menu', 'ca_directory_import_register_tools_page' );
add_action( 'admin_notices', 'ca_directory_import_render_notice' );
add_action( 'admin_post_ca_directory_import_run', 'ca_directory_import_handle_run' );
add_action( 'admin_post_ca_directory_import_sync_reviews', 'ca_directory_import_handle_sync_reviews' );

/**
 * Register the import tools page.
 */
function ca_directory_import_register_tools_page() {
	add_management_page(
		'Directory Import',
		'Directory Import',
		'manage_options',
		'ca-directory-import',
		'ca_directory_import_render_page'
	);
}

/**
 * Render the import tools page.
 */
function ca_directory_import_render_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}

	$stats        = ca_directory_import_get_stats();
	$source_path  = ca_directory_import_get_source_path();
	$source_error = is_wp_error( $stats['source_error'] ) ? $stats['source_error']->get_error_message() : '';
	?>
	<div class="wrap">
		<h1>Directory Import</h1>
		<p>Imports the live business dataset from the local ChineseArizona dev export into GeoDirectory.</p>

		<table class="widefat striped" style="max-width:760px;margin:1rem 0 2rem;">
			<tbody>
				<tr>
					<th scope="row">Source file</th>
					<td><code><?php echo esc_html( $source_path ); ?></code></td>
				</tr>
				<tr>
					<th scope="row">Live businesses in source</th>
					<td><?php echo esc_html( $stats['source_live'] ); ?></td>
				</tr>
				<tr>
					<th scope="row">Published GeoDirectory listings</th>
					<td><?php echo esc_html( $stats['wp_published'] ); ?></td>
				</tr>
				<tr>
					<th scope="row">Imported listings tracked by source slug</th>
					<td><?php echo esc_html( $stats['tracked_imports'] ); ?></td>
				</tr>
				<tr>
					<th scope="row">Imported listings with Google data</th>
					<td><?php echo esc_html( $stats['tracked_with_google'] ); ?></td>
				</tr>
				<?php if ( $source_error ) : ?>
					<tr>
						<th scope="row">Source error</th>
						<td><?php echo esc_html( $source_error ); ?></td>
					</tr>
				<?php endif; ?>
			</tbody>
		</table>

		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="margin-bottom:1rem;">
			<?php wp_nonce_field( 'ca_directory_import_run' ); ?>
			<input type="hidden" name="action" value="ca_directory_import_run" />
			<?php submit_button( 'Import / Update Live Businesses', 'primary', 'submit', false ); ?>
		</form>

		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
			<?php wp_nonce_field( 'ca_directory_import_sync_reviews' ); ?>
			<input type="hidden" name="action" value="ca_directory_import_sync_reviews" />
			<?php submit_button( 'Sync Imported Listings From Google', 'secondary', 'submit', false ); ?>
		</form>
	</div>
	<?php
}

/**
 * Render admin notices.
 */
function ca_directory_import_render_notice() {
	if ( empty( $_GET['ca_directory_import_notice'] ) || empty( $_GET['ca_directory_import_message'] ) ) {
		return;
	}

	$status  = sanitize_key( wp_unslash( $_GET['ca_directory_import_notice'] ) );
	$message = sanitize_text_field( wp_unslash( $_GET['ca_directory_import_message'] ) );
	$class   = 'notice-success';

	if ( 'error' === $status ) {
		$class = 'notice-error';
	} elseif ( 'warning' === $status ) {
		$class = 'notice-warning';
	}

	printf(
		'<div class="notice %1$s is-dismissible"><p>%2$s</p></div>',
		esc_attr( $class ),
		esc_html( $message )
	);
}

/**
 * Handle the import action.
 */
function ca_directory_import_handle_run() {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( 'You do not have permission to do that.' );
	}

	check_admin_referer( 'ca_directory_import_run' );

	$result = ca_directory_import_upsert_live_businesses();

	if ( is_wp_error( $result ) ) {
		ca_directory_import_redirect_with_notice( 'error', $result->get_error_message() );
	}

	$message = sprintf(
		'Directory import finished. %1$d created, %2$d updated, %3$d drafted as stale, %4$d error(s).',
		(int) $result['created'],
		(int) $result['updated'],
		(int) $result['drafted'],
		(int) $result['errors']
	);

	if ( ! empty( $result['error_messages'] ) ) {
		$message .= ' First error: ' . reset( $result['error_messages'] );
	}

	ca_directory_import_redirect_with_notice( $result['errors'] ? 'warning' : 'success', $message );
}

/**
 * Handle the Google review sync action.
 */
function ca_directory_import_handle_sync_reviews() {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( 'You do not have permission to do that.' );
	}

	check_admin_referer( 'ca_directory_import_sync_reviews' );

	if ( ! function_exists( 'ca_google_reviews_sync_listing' ) ) {
		ca_directory_import_redirect_with_notice( 'error', 'The Google Reviews sync plugin is not available.' );
	}

	$post_ids = ca_directory_import_get_imported_post_ids();

	if ( empty( $post_ids ) ) {
		ca_directory_import_redirect_with_notice( 'warning', 'No imported listings were found to sync.' );
	}

	$successes    = 0;
	$failures     = 0;
	$error_counts = array();

	foreach ( $post_ids as $post_id ) {
		$result = ca_google_reviews_sync_listing( (int) $post_id );

		if ( is_wp_error( $result ) ) {
			$failures++;
			$message = trim( (string) $result->get_error_message() );

			if ( '' !== $message ) {
				if ( ! isset( $error_counts[ $message ] ) ) {
					$error_counts[ $message ] = 0;
				}

				$error_counts[ $message ]++;
			}
		} else {
			$successes++;
		}
	}

	$message = sprintf(
		'Imported listing review sync finished. %1$d synced, %2$d failed.',
		$successes,
		$failures
	);

	if ( $failures && ! empty( $error_counts ) ) {
		arsort( $error_counts );
		$message .= ' Most common failure: ' . (string) key( $error_counts );
	}

	ca_directory_import_redirect_with_notice( $failures ? 'warning' : 'success', $message );
}

/**
 * Redirect back to the tools page with a notice.
 *
 * @param string $status  Notice status.
 * @param string $message Notice message.
 */
function ca_directory_import_redirect_with_notice( $status, $message ) {
	wp_safe_redirect(
		add_query_arg(
			array(
				'page'                       => 'ca-directory-import',
				'ca_directory_import_notice' => $status,
				'ca_directory_import_message'=> $message,
			),
			admin_url( 'tools.php' )
		)
	);
	exit;
}

/**
 * Get the source path.
 *
 * @return string
 */
function ca_directory_import_get_source_path() {
	$path = defined( 'CA_DIRECTORY_IMPORT_OVERRIDE_PATH' ) && CA_DIRECTORY_IMPORT_OVERRIDE_PATH ? CA_DIRECTORY_IMPORT_OVERRIDE_PATH : CA_DIRECTORY_IMPORT_SOURCE_PATH;
	return apply_filters( 'ca_directory_import_source_path', $path );
}

/**
 * Load the source data.
 *
 * @return array|WP_Error
 */
function ca_directory_import_load_source_data() {
	$path = ca_directory_import_get_source_path();

	if ( ! file_exists( $path ) ) {
		return new WP_Error( 'missing_source_file', 'The local directory export file could not be found.' );
	}

	$json = file_get_contents( $path );

	if ( false === $json || '' === trim( $json ) ) {
		return new WP_Error( 'empty_source_file', 'The local directory export file is empty or unreadable.' );
	}

	$data = json_decode( $json, true );

	if ( ! is_array( $data ) ) {
		return new WP_Error( 'invalid_source_json', 'The local directory export file does not contain valid JSON.' );
	}

	return $data;
}

/**
 * Return live businesses from the source dataset.
 *
 * @return array|WP_Error
 */
function ca_directory_import_get_live_businesses() {
	$data = ca_directory_import_load_source_data();

	if ( is_wp_error( $data ) ) {
		return $data;
	}

	$businesses = array();
	$seen_keys  = array();

	foreach ( $data as $row ) {
		if ( ! is_array( $row ) || ! isset( $row['status'] ) || 'live' !== $row['status'] ) {
			continue;
		}

		$dedupe_key = ca_directory_import_business_dedupe_key( $row );

		if ( isset( $seen_keys[ $dedupe_key ] ) ) {
			continue;
		}

		$seen_keys[ $dedupe_key ] = true;
		$businesses[]             = $row;
	}

	usort(
		$businesses,
		static function ( $left, $right ) {
			return strcmp(
				(string) ( $left['slug'] ?? '' ),
				(string) ( $right['slug'] ?? '' )
			);
		}
	);

	return $businesses;
}

/**
 * Build the dedupe key for a source business row.
 *
 * @param array $business Source business row.
 * @return string
 */
function ca_directory_import_business_dedupe_key( array $business ) {
	$name    = strtolower( trim( (string) ( $business['name']['en'] ?? '' ) ) );
	$address = strtolower( trim( (string) ( $business['address'] ?? '' ) ) );

	if ( '' === $address ) {
		$address = strtolower( trim( (string) ( $business['serviceAreaText'] ?? '' ) ) );
	}

	return $name . '|' . $address;
}

/**
 * Get page stats.
 *
 * @return array
 */
function ca_directory_import_get_stats() {
	$source       = ca_directory_import_get_live_businesses();
	$source_error = is_wp_error( $source ) ? $source : null;
	$post_ids     = get_posts(
		array(
			'post_type'        => 'gd_place',
			'post_status'      => array( 'publish', 'pending', 'draft', 'future', 'private' ),
			'fields'           => 'ids',
			'numberposts'      => -1,
			'suppress_filters' => false,
		)
	);

	return array(
		'source_error'       => $source_error,
		'source_live'        => is_wp_error( $source ) ? 0 : count( $source ),
		'wp_published'       => count(
			get_posts(
				array(
					'post_type'        => 'gd_place',
					'post_status'      => 'publish',
					'fields'           => 'ids',
					'numberposts'      => -1,
					'suppress_filters' => false,
				)
			)
		),
		'tracked_imports'    => count( ca_directory_import_get_imported_post_ids() ),
		'tracked_with_google'=> ca_directory_import_count_imported_posts_with_google_data(),
		'wp_total'           => count( $post_ids ),
	);
}

/**
 * Import or update live businesses from the source dataset.
 *
 * @return array|WP_Error
 */
function ca_directory_import_upsert_live_businesses() {
	$businesses = ca_directory_import_get_live_businesses();

	if ( is_wp_error( $businesses ) ) {
		return $businesses;
	}

	if ( empty( $_SERVER['REMOTE_ADDR'] ) ) {
		$_SERVER['REMOTE_ADDR'] = '127.0.0.1';
	}

	$results = array(
		'created'        => 0,
		'updated'        => 0,
		'drafted'        => 0,
		'errors'         => 0,
		'error_messages' => array(),
	);
	$live_slugs = array();

	foreach ( $businesses as $business ) {
		$live_slugs[] = (string) ( $business['slug'] ?? '' );
		$result       = ca_directory_import_upsert_business( $business );

		if ( is_wp_error( $result ) ) {
			$results['errors']++;
			$results['error_messages'][] = $result->get_error_message();
			continue;
		}

		if ( 'created' === $result['action'] ) {
			$results['created']++;
		} else {
			$results['updated']++;
		}
	}

	$results['drafted'] = ca_directory_import_mark_missing_source_posts_draft( $live_slugs );

	return $results;
}

/**
 * Upsert a single business into GeoDirectory.
 *
 * @param array $business Source business row.
 * @return array|WP_Error
 */
function ca_directory_import_upsert_business( array $business ) {
	$name = trim( (string) ( $business['name']['en'] ?? '' ) );
	$slug = sanitize_title( (string) ( $business['slug'] ?? '' ) );

	if ( '' === $name || '' === $slug ) {
		return new WP_Error( 'invalid_business_row', 'A source business row is missing its required name or slug.' );
	}

	$term_id = ca_directory_import_get_category_term_id( (string) ( $business['categorySlug'] ?? '' ) );

	if ( is_wp_error( $term_id ) ) {
		return $term_id;
	}

	$address    = ca_directory_import_parse_address(
		(string) ( $business['address'] ?? '' ),
		(string) ( $business['city'] ?? '' ),
		(string) ( $business['serviceAreaText'] ?? '' )
	);
	$tags       = ca_directory_import_build_tags( $business );
	$content    = ca_directory_import_build_post_content( $business );
	$existing_id = ca_directory_import_find_existing_post_id( $business, $address );
	$coords      = isset( $business['coordinates'] ) && is_array( $business['coordinates'] ) ? $business['coordinates'] : array();

	$postarr = array(
		'post_type'        => 'gd_place',
		'post_status'      => 'publish',
		'post_title'       => $name,
		'post_name'        => $slug,
		'post_content'     => $content,
		'tax_input'        => array(
			'gd_placecategory' => array( $term_id ),
		),
		'default_category' => $term_id,
		'post_tags'        => $tags,
		'street'           => $address['street'],
		'street2'          => $address['street2'],
		'city'             => $address['city'],
		'region'           => $address['region'],
		'country'          => $address['country'],
		'zip'              => $address['zip'],
		'latitude'         => isset( $coords['lat'] ) ? (string) $coords['lat'] : '',
		'longitude'        => isset( $coords['lng'] ) ? (string) $coords['lng'] : '',
		'mapview'          => 'ROADMAP',
		'mapzoom'          => '14',
	);

	if ( $existing_id ) {
		$postarr['ID'] = $existing_id;
		$post_id       = wp_update_post( $postarr, true );
		$action        = 'updated';
	} else {
		$post_id = wp_insert_post( $postarr, true );
		$action  = 'created';
	}

	if ( is_wp_error( $post_id ) ) {
		return new WP_Error(
			'directory_import_save_failed',
			sprintf(
				'Failed to save "%1$s": %2$s',
				$name,
				$post_id->get_error_message()
			)
		);
	}

	update_post_meta( $post_id, CA_DIRECTORY_IMPORT_META_SOURCE_ID, (string) ( $business['id'] ?? '' ) );
	update_post_meta( $post_id, CA_DIRECTORY_IMPORT_META_SOURCE_SLUG, $slug );
	update_post_meta( $post_id, CA_DIRECTORY_IMPORT_META_SOURCE_STATUS, (string) ( $business['status'] ?? '' ) );
	update_post_meta( $post_id, CA_DIRECTORY_IMPORT_META_SOURCE_LAST_UPDATE, (string) ( $business['lastUpdated'] ?? '' ) );
	update_post_meta( $post_id, CA_DIRECTORY_IMPORT_META_IMPORTED_AT, current_time( 'mysql' ) );
	ca_directory_import_update_or_delete_meta( $post_id, CA_DIRECTORY_IMPORT_META_PHONE, (string) ( $business['phone'] ?? '' ) );
	ca_directory_import_update_or_delete_meta( $post_id, CA_DIRECTORY_IMPORT_META_EMAIL, (string) ( $business['email'] ?? '' ) );
	ca_directory_import_update_or_delete_meta( $post_id, CA_DIRECTORY_IMPORT_META_WEBSITE, (string) ( $business['website'] ?? '' ) );

	return array(
		'post_id' => (int) $post_id,
		'action'  => $action,
	);
}

/**
 * Find an existing GeoDirectory post for a source business.
 *
 * @param array $business Source business row.
 * @param array $address  Parsed address pieces.
 * @return int
 */
function ca_directory_import_find_existing_post_id( array $business, array $address ) {
	global $wpdb;

	$slug = sanitize_title( (string) ( $business['slug'] ?? '' ) );

	if ( '' !== $slug ) {
		$by_source_meta = get_posts(
			array(
				'post_type'        => 'gd_place',
				'post_status'      => array( 'publish', 'pending', 'draft', 'future', 'private' ),
				'fields'           => 'ids',
				'numberposts'      => 1,
				'meta_key'         => CA_DIRECTORY_IMPORT_META_SOURCE_SLUG,
				'meta_value'       => $slug,
				'suppress_filters' => false,
			)
		);

		if ( ! empty( $by_source_meta[0] ) ) {
			return (int) $by_source_meta[0];
		}

		$by_path = get_page_by_path( $slug, OBJECT, 'gd_place' );

		if ( $by_path instanceof WP_Post ) {
			return (int) $by_path->ID;
		}
	}

	$title  = trim( (string) ( $business['name']['en'] ?? '' ) );
	$street = trim( (string) $address['street'] );

	if ( '' === $title ) {
		return 0;
	}

	$table = $wpdb->prefix . 'geodir_gd_place_detail';
	$sql   = "
		SELECT p.ID
		FROM {$wpdb->posts} p
		INNER JOIN {$table} d ON d.post_id = p.ID
		WHERE p.post_type = 'gd_place'
			AND p.post_status IN ('publish', 'pending', 'draft', 'future', 'private')
			AND LOWER(p.post_title) = LOWER(%s)
	";
	$args  = array( $title );

	if ( '' !== $street ) {
		$sql   .= ' AND LOWER(COALESCE(d.street, \'\')) = LOWER(%s)';
		$args[] = $street;
	}

	$sql .= ' ORDER BY p.ID DESC LIMIT 1';

	$post_id = (int) $wpdb->get_var( $wpdb->prepare( $sql, $args ) );

	return $post_id > 0 ? $post_id : 0;
}

/**
 * Build the saved post content.
 *
 * @param array $business Source business row.
 * @return string
 */
function ca_directory_import_build_post_content( array $business ) {
	$paragraphs   = array();
	$description  = trim( (string) ( $business['description']['en'] ?? '' ) );
	$short        = trim( (string) ( $business['shortDescription']['en'] ?? '' ) );
	$phone        = trim( (string) ( $business['phone'] ?? '' ) );
	$email        = trim( (string) ( $business['email'] ?? '' ) );
	$website      = trim( (string) ( $business['website'] ?? '' ) );
	$service_area = trim( (string) ( $business['serviceAreaText'] ?? '' ) );
	$hours        = isset( $business['hours'] ) && is_array( $business['hours'] ) ? $business['hours'] : array();

	if ( '' !== $description ) {
		$paragraphs[] = '<p>' . esc_html( $description ) . '</p>';
	} elseif ( '' !== $short ) {
		$paragraphs[] = '<p>' . esc_html( $short ) . '</p>';
	}

	if ( '' !== $service_area ) {
		$paragraphs[] = '<p><strong>Service area:</strong> ' . esc_html( $service_area ) . '</p>';
	}

	if ( '' !== $phone ) {
		$paragraphs[] = '<p><strong>Phone:</strong> ' . esc_html( $phone ) . '</p>';
	}

	if ( '' !== $email ) {
		$paragraphs[] = '<p><strong>Email:</strong> ' . esc_html( $email ) . '</p>';
	}

	if ( '' !== $website ) {
		$paragraphs[] = '<p><strong>Website:</strong> <a href="' . esc_url( $website ) . '">' . esc_html( $website ) . '</a></p>';
	}

	if ( ! empty( $hours ) ) {
		$lines = array();

		foreach ( $hours as $row ) {
			$label = trim( (string) ( $row['label'] ?? '' ) );
			$value = trim( (string) ( $row['value'] ?? '' ) );

			if ( '' !== $label && '' !== $value ) {
				$lines[] = esc_html( $label . ': ' . $value );
			}
		}

		if ( ! empty( $lines ) ) {
			$paragraphs[] = '<p><strong>Hours:</strong><br>' . implode( '<br>', $lines ) . '</p>';
		}
	}

	if ( empty( $paragraphs ) ) {
		$paragraphs[] = '<p>Imported from the current ChineseArizona directory dataset.</p>';
	}

	return wp_kses_post( implode( "\n\n", $paragraphs ) );
}

/**
 * Build a small tag set for GeoDirectory.
 *
 * @param array $business Source business row.
 * @return array
 */
function ca_directory_import_build_tags( array $business ) {
	$tags         = array();
	$city         = trim( (string) ( $business['city'] ?? '' ) );
	$category     = trim( (string) ( $business['categorySlug'] ?? '' ) );
	$languages    = isset( $business['languages'] ) && is_array( $business['languages'] ) ? $business['languages'] : array();
	$search_terms = isset( $business['searchAliases'] ) && is_array( $business['searchAliases'] ) ? $business['searchAliases'] : array();

	if ( '' !== $city ) {
		$tags[] = strtolower( $city );
	}

	$category_tags = array(
		'dining'          => 'chinese restaurant',
		'education'       => 'education',
		'medical'         => 'medical',
		'real-estate'     => 'real estate',
		'legal-finance'   => 'law & finance',
		'beauty-wellness' => 'beauty & wellness',
		'shopping'        => 'shopping',
		'local-services'  => 'local services',
		'home-services'   => 'home services',
	);

	if ( isset( $category_tags[ $category ] ) ) {
		$tags[] = $category_tags[ $category ];
	}

	foreach ( $languages as $language ) {
		$language = trim( (string) $language );

		if ( in_array( $language, array( 'Mandarin', 'Cantonese', 'Taiwanese' ), true ) ) {
			$tags[] = strtolower( $language );
		}
	}

	foreach ( $search_terms as $term ) {
		$term = trim( (string) $term );

		if ( '' === $term ) {
			continue;
		}

		if ( false !== stripos( $term, 'chinese' ) || false !== stripos( $term, 'taiwanese' ) || false !== stripos( $term, 'mandarin' ) ) {
			$tags[] = strtolower( $term );
		}

		if ( count( $tags ) >= 6 ) {
			break;
		}
	}

	$tags = array_map( 'sanitize_text_field', $tags );
	$tags = array_filter( array_unique( $tags ) );

	return array_values( array_slice( $tags, 0, 6 ) );
}

/**
 * Parse the source address into GeoDirectory location fields.
 *
 * @param string $address       Full source address.
 * @param string $city          Source city.
 * @param string $service_area  Source service area fallback.
 * @return array
 */
function ca_directory_import_parse_address( $address, $city = '', $service_area = '' ) {
	$address      = trim( (string) $address );
	$city         = trim( (string) $city );
	$service_area = trim( (string) $service_area );
	$street       = '';
	$street2      = '';
	$zip          = '';
	$region       = 'Arizona';
	$country      = 'United States';

	if ( preg_match( '/^(.*?),\s*([^,]+),\s*([A-Z]{2}|[A-Za-z ]+),\s*(\d{5}(?:-\d{4})?)$/', $address, $matches ) ) {
		$street = trim( $matches[1] );
		$city   = trim( $matches[2] );
		$region = ca_directory_import_expand_state( trim( $matches[3] ) );
		$zip    = trim( $matches[4] );
	} elseif ( '' !== $address ) {
		$parts = array_map( 'trim', explode( ',', $address ) );

		if ( ! empty( $parts[0] ) ) {
			$street = $parts[0];
		}

		if ( empty( $city ) && ! empty( $parts[1] ) ) {
			$city = $parts[1];
		}

		if ( ! empty( $parts[2] ) ) {
			$region = ca_directory_import_expand_state( $parts[2] );
		}

		if ( ! empty( $parts[3] ) ) {
			$zip = trim( $parts[3] );
		}
	}

	if ( '' === $street && '' !== $service_area ) {
		$street = $service_area;
	}

	if ( '' === $street && '' !== $city ) {
		$street = $city;
	}

	if ( '' === $city && preg_match( '/([A-Za-z ]+),\s*(?:AZ|Arizona)\b/i', $service_area, $matches ) ) {
		$city = trim( $matches[1] );
	}

	if ( '' === $city ) {
		$city = 'Phoenix';
	}

	return array(
		'street'  => sanitize_text_field( $street ),
		'street2' => sanitize_text_field( $street2 ),
		'city'    => sanitize_text_field( $city ),
		'region'  => sanitize_text_field( $region ),
		'country' => sanitize_text_field( $country ),
		'zip'     => sanitize_text_field( $zip ),
	);
}

/**
 * Expand a US state abbreviation when possible.
 *
 * @param string $value Raw state value.
 * @return string
 */
function ca_directory_import_expand_state( $value ) {
	$value = trim( (string) $value );

	$states = array(
		'AZ' => 'Arizona',
		'CA' => 'California',
		'NV' => 'Nevada',
		'NM' => 'New Mexico',
		'TX' => 'Texas',
		'UT' => 'Utah',
	);

	$upper = strtoupper( $value );

	if ( isset( $states[ $upper ] ) ) {
		return $states[ $upper ];
	}

	return $value ? $value : 'Arizona';
}

/**
 * Resolve the GeoDirectory category term for a source category slug.
 *
 * @param string $category_slug Source category slug.
 * @return int|WP_Error
 */
function ca_directory_import_get_category_term_id( $category_slug ) {
	$category_slug = trim( (string) $category_slug );
	$taxonomy      = 'gd_placecategory';

	$map = array(
		'auto-services'        => array( 'slug' => 'auto-services', 'name' => 'Auto Services' ),
		'beauty-wellness'      => array( 'slug' => 'beauty-wellness', 'name' => 'Beauty & Wellness' ),
		'community-organizations' => array( 'slug' => 'community-organizations', 'name' => 'Community Organizations' ),
		'dining'               => array( 'slug' => 'restaurants', 'name' => 'Restaurants' ),
		'education'            => array( 'slug' => 'education', 'name' => 'Education' ),
		'home-services'        => array( 'slug' => 'home-services', 'name' => 'Home Services' ),
		'legal-finance'        => array( 'slug' => 'law-finance', 'name' => 'Law & Finance' ),
		'local-services'       => array( 'slug' => 'local-services', 'name' => 'Local Services' ),
		'medical'              => array( 'slug' => 'medical', 'name' => 'Medical' ),
		'real-estate'          => array( 'slug' => 'real-estate', 'name' => 'Real Estate' ),
		'shopping'             => array( 'slug' => 'shopping', 'name' => 'Shopping' ),
		'travel'               => array( 'slug' => 'travel', 'name' => 'Travel' ),
	);

	$mapped = isset( $map[ $category_slug ] ) ? $map[ $category_slug ] : array(
		'slug' => sanitize_title( $category_slug ),
		'name' => ucwords( str_replace( '-', ' ', $category_slug ) ),
	);

	$term = get_term_by( 'slug', $mapped['slug'], $taxonomy );

	if ( $term instanceof WP_Term ) {
		return (int) $term->term_id;
	}

	$inserted = wp_insert_term(
		$mapped['name'],
		$taxonomy,
		array(
			'slug' => $mapped['slug'],
		)
	);

	if ( is_wp_error( $inserted ) ) {
		return new WP_Error(
			'failed_term_insert',
			sprintf(
				'Failed to create the "%1$s" GeoDirectory category: %2$s',
				$mapped['name'],
				$inserted->get_error_message()
			)
		);
	}

	return (int) $inserted['term_id'];
}

/**
 * Mark imported posts missing from the current live source as draft.
 *
 * @param array $live_slugs Live source slugs.
 * @return int
 */
function ca_directory_import_mark_missing_source_posts_draft( array $live_slugs ) {
	$post_ids = ca_directory_import_get_imported_post_ids();
	$drafted  = 0;
	$keep     = array_fill_keys( array_filter( array_map( 'sanitize_title', $live_slugs ) ), true );

	foreach ( $post_ids as $post_id ) {
		$source_slug = sanitize_title( (string) get_post_meta( $post_id, CA_DIRECTORY_IMPORT_META_SOURCE_SLUG, true ) );

		if ( '' !== $source_slug && isset( $keep[ $source_slug ] ) ) {
			continue;
		}

		if ( 'draft' === get_post_status( $post_id ) ) {
			continue;
		}

		$result = wp_update_post(
			array(
				'ID'          => (int) $post_id,
				'post_status' => 'draft',
			),
			true
		);

		if ( ! is_wp_error( $result ) ) {
			$drafted++;
		}
	}

	return $drafted;
}

/**
 * Get IDs of posts imported from the dev dataset.
 *
 * @return int[]
 */
function ca_directory_import_get_imported_post_ids() {
	return get_posts(
		array(
			'post_type'        => 'gd_place',
			'post_status'      => array( 'publish', 'pending', 'draft', 'future', 'private' ),
			'fields'           => 'ids',
			'numberposts'      => -1,
			'meta_key'         => CA_DIRECTORY_IMPORT_META_SOURCE_SLUG,
			'suppress_filters' => false,
		)
	);
}

/**
 * Count imported posts with stored Google review data.
 *
 * @return int
 */
function ca_directory_import_count_imported_posts_with_google_data() {
	$count = 0;

	foreach ( ca_directory_import_get_imported_post_ids() as $post_id ) {
		$rating = trim( (string) get_post_meta( $post_id, '_ca_google_rating', true ) );
		$reviews = trim( (string) get_post_meta( $post_id, '_ca_google_rating_count', true ) );

		if ( '' !== $rating && '' !== $reviews ) {
			$count++;
		}
	}

	return $count;
}

/**
 * Update or delete post meta based on value.
 *
 * @param int    $post_id Post ID.
 * @param string $key     Meta key.
 * @param string $value   Meta value.
 */
function ca_directory_import_update_or_delete_meta( $post_id, $key, $value ) {
	$value = trim( (string) $value );

	if ( '' === $value ) {
		delete_post_meta( $post_id, $key );
		return;
	}

	update_post_meta( $post_id, $key, $value );
}

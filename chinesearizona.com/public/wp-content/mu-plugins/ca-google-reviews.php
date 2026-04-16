<?php
/**
 * Plugin Name: CA Google Reviews
 * Description: Lets GeoDirectory listings use Google review ratings and counts.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const CA_GOOGLE_REVIEWS_OPTION_API_KEY  = 'ca_google_reviews_api_key';
const CA_GOOGLE_REVIEWS_OPTION_PREFER   = 'ca_google_reviews_prefer_google';
const CA_GOOGLE_REVIEWS_META_PLACE_ID   = '_ca_google_place_id';
const CA_GOOGLE_REVIEWS_META_RATING     = '_ca_google_rating';
const CA_GOOGLE_REVIEWS_META_COUNT      = '_ca_google_rating_count';
const CA_GOOGLE_REVIEWS_META_URL        = '_ca_google_reviews_url';
const CA_GOOGLE_REVIEWS_META_SYNCED_AT  = '_ca_google_reviews_synced_at';
const CA_GOOGLE_REVIEWS_META_LAST_ERROR = '_ca_google_reviews_last_error';

add_action( 'add_meta_boxes', 'ca_google_reviews_add_meta_box' );
add_action( 'admin_init', 'ca_google_reviews_register_settings' );
add_action( 'admin_menu', 'ca_google_reviews_register_settings_page' );
add_action( 'admin_notices', 'ca_google_reviews_render_admin_notice' );
add_action( 'admin_post_ca_google_reviews_sync_all', 'ca_google_reviews_handle_sync_all' );
add_action( 'admin_post_ca_google_reviews_sync_single', 'ca_google_reviews_handle_sync_single' );
add_action( 'save_post_gd_place', 'ca_google_reviews_save_meta_box', 10, 2 );
add_filter( 'geodir_get_post_info', 'ca_google_reviews_filter_post_info', 20, 2 );
add_filter( 'geodir_overall_rating_label', 'ca_google_reviews_filter_rating_label' );
add_filter( 'geodir_overall_rating_label_main', 'ca_google_reviews_filter_rating_label' );
add_filter( 'geodir_output_rating_title', 'ca_google_reviews_filter_rating_title', 10, 3 );

/**
 * Register the plugin settings.
 */
function ca_google_reviews_register_settings() {
	register_setting(
		'ca_google_reviews',
		CA_GOOGLE_REVIEWS_OPTION_API_KEY,
		array(
			'type'              => 'string',
			'sanitize_callback' => 'ca_google_reviews_sanitize_api_key',
			'default'           => '',
		)
	);

	register_setting(
		'ca_google_reviews',
		CA_GOOGLE_REVIEWS_OPTION_PREFER,
		array(
			'type'              => 'boolean',
			'sanitize_callback' => 'ca_google_reviews_sanitize_checkbox',
			'default'           => 1,
		)
	);
}

/**
 * Register the settings page.
 */
function ca_google_reviews_register_settings_page() {
	add_options_page(
		'Google Reviews',
		'Google Reviews',
		'manage_options',
		'ca-google-reviews',
		'ca_google_reviews_render_settings_page'
	);
}

/**
 * Render the settings page.
 */
function ca_google_reviews_render_settings_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}

	$stats = ca_google_reviews_get_sync_stats();
	?>
	<div class="wrap">
		<h1>Google Reviews</h1>
		<p>GeoDirectory is now set up to prefer Google review ratings and counts when they exist.</p>

		<table class="widefat striped" style="max-width:640px;margin:1rem 0 2rem;">
			<tbody>
				<tr>
					<th scope="row">Listings with Google data</th>
					<td><?php echo esc_html( $stats['synced'] ); ?> / <?php echo esc_html( $stats['total'] ); ?></td>
				</tr>
				<tr>
					<th scope="row">Preference</th>
					<td><?php echo ca_google_reviews_prefer_google() ? 'Google ratings enabled' : 'Google ratings disabled'; ?></td>
				</tr>
			</tbody>
		</table>

		<form method="post" action="options.php">
			<?php settings_fields( 'ca_google_reviews' ); ?>
			<table class="form-table" role="presentation">
				<tbody>
					<tr>
						<th scope="row"><label for="ca_google_reviews_api_key">Google Places API key</label></th>
						<td>
							<input
								name="<?php echo esc_attr( CA_GOOGLE_REVIEWS_OPTION_API_KEY ); ?>"
								id="ca_google_reviews_api_key"
								type="text"
								class="regular-text code"
								value="<?php echo esc_attr( ca_google_reviews_get_api_key( false ) ); ?>"
								autocomplete="off"
							/>
							<p class="description">Used for one-click sync and bulk sync through Places API (New). Manual Google rating/count entry still works without it.</p>
						</td>
					</tr>
					<tr>
						<th scope="row">Display source</th>
						<td>
							<input
								name="<?php echo esc_attr( CA_GOOGLE_REVIEWS_OPTION_PREFER ); ?>"
								type="hidden"
								value="0"
							/>
							<label for="ca_google_reviews_prefer_google">
								<input
									name="<?php echo esc_attr( CA_GOOGLE_REVIEWS_OPTION_PREFER ); ?>"
									id="ca_google_reviews_prefer_google"
									type="checkbox"
									value="1"
									<?php checked( ca_google_reviews_prefer_google() ); ?>
								/>
								Always prefer Google rating/count over GeoDirectory review totals
							</label>
						</td>
					</tr>
				</tbody>
			</table>
			<?php submit_button( 'Save Settings' ); ?>
		</form>

		<hr />

		<h2>Bulk Sync</h2>
		<p>Bulk sync tries to find each listing by its title and address through Places API (New), then stores the Google rating and review count on the listing.</p>
		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
			<?php wp_nonce_field( 'ca_google_reviews_sync_all' ); ?>
			<input type="hidden" name="action" value="ca_google_reviews_sync_all" />
			<?php submit_button( 'Sync All Listings From Google', 'secondary', 'submit', false ); ?>
		</form>
	</div>
	<?php
}

/**
 * Render the listing metabox.
 *
 * @param WP_Post $post Post object.
 */
function ca_google_reviews_render_meta_box( $post ) {
	$data    = ca_google_reviews_get_stored_data( $post->ID );
	$sync_url = '';

	if ( current_user_can( 'edit_post', $post->ID ) ) {
		$sync_url = wp_nonce_url(
			add_query_arg(
				array(
					'action'  => 'ca_google_reviews_sync_single',
					'post_id' => $post->ID,
				),
				admin_url( 'admin-post.php' )
			),
			'ca_google_reviews_sync_single_' . $post->ID
		);
	}

	wp_nonce_field( 'ca_google_reviews_meta_box', 'ca_google_reviews_meta_box_nonce' );
	?>
	<p>GeoDirectory will use these Google values on the front end when they are present.</p>
	<table class="form-table" role="presentation">
		<tbody>
			<tr>
				<th scope="row"><label for="ca_google_place_id">Google Place ID</label></th>
				<td><input id="ca_google_place_id" name="ca_google_place_id" type="text" class="regular-text code" value="<?php echo esc_attr( $data['place_id'] ); ?>" /></td>
			</tr>
			<tr>
				<th scope="row"><label for="ca_google_rating">Google Rating</label></th>
				<td><input id="ca_google_rating" name="ca_google_rating" type="number" min="0" max="5" step="0.1" value="<?php echo esc_attr( $data['rating'] ); ?>" /></td>
			</tr>
			<tr>
				<th scope="row"><label for="ca_google_rating_count">Google Review Count</label></th>
				<td><input id="ca_google_rating_count" name="ca_google_rating_count" type="number" min="0" step="1" value="<?php echo esc_attr( $data['count'] ); ?>" /></td>
			</tr>
			<tr>
				<th scope="row"><label for="ca_google_reviews_url">Google Reviews URL</label></th>
				<td><input id="ca_google_reviews_url" name="ca_google_reviews_url" type="url" class="large-text code" value="<?php echo esc_attr( $data['url'] ); ?>" /></td>
			</tr>
			<tr>
				<th scope="row">Last synced</th>
				<td><?php echo $data['synced_at'] ? esc_html( $data['synced_at'] ) : 'Not synced yet'; ?></td>
			</tr>
			<tr>
				<th scope="row">Last error</th>
				<td><?php echo $data['last_error'] ? esc_html( $data['last_error'] ) : 'None'; ?></td>
			</tr>
		</tbody>
	</table>

	<?php if ( $sync_url ) : ?>
		<p>
			<a class="button button-secondary" href="<?php echo esc_url( $sync_url ); ?>">Sync Google rating now</a>
			<?php if ( ! ca_google_reviews_get_api_key() ) : ?>
				<span class="description" style="margin-left:8px;">Add a Google Places API key in Settings → Google Reviews to use sync.</span>
			<?php endif; ?>
		</p>
	<?php endif; ?>
	<?php
}

/**
 * Add the listing metabox.
 */
function ca_google_reviews_add_meta_box() {
	add_meta_box(
		'ca-google-reviews',
		'Google Reviews',
		'ca_google_reviews_render_meta_box',
		'gd_place',
		'side',
		'default'
	);
}

/**
 * Save listing meta.
 *
 * @param int     $post_id Post ID.
 * @param WP_Post $post    Post object.
 */
function ca_google_reviews_save_meta_box( $post_id, $post ) {
	if ( ! isset( $_POST['ca_google_reviews_meta_box_nonce'] ) ) {
		return;
	}

	if ( ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['ca_google_reviews_meta_box_nonce'] ) ), 'ca_google_reviews_meta_box' ) ) {
		return;
	}

	if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
		return;
	}

	if ( ! current_user_can( 'edit_post', $post_id ) ) {
		return;
	}

	if ( 'gd_place' !== $post->post_type ) {
		return;
	}

	$place_id = isset( $_POST['ca_google_place_id'] ) ? sanitize_text_field( wp_unslash( $_POST['ca_google_place_id'] ) ) : '';
	$rating   = isset( $_POST['ca_google_rating'] ) ? ca_google_reviews_sanitize_rating( wp_unslash( $_POST['ca_google_rating'] ) ) : '';
	$count    = isset( $_POST['ca_google_rating_count'] ) ? absint( wp_unslash( $_POST['ca_google_rating_count'] ) ) : '';
	$url      = isset( $_POST['ca_google_reviews_url'] ) ? esc_url_raw( wp_unslash( $_POST['ca_google_reviews_url'] ) ) : '';

	ca_google_reviews_update_or_delete_meta( $post_id, CA_GOOGLE_REVIEWS_META_PLACE_ID, $place_id );
	ca_google_reviews_update_or_delete_meta( $post_id, CA_GOOGLE_REVIEWS_META_RATING, $rating );
	ca_google_reviews_update_or_delete_meta( $post_id, CA_GOOGLE_REVIEWS_META_COUNT, '' === $rating && 0 === $count ? '' : $count );
	ca_google_reviews_update_or_delete_meta( $post_id, CA_GOOGLE_REVIEWS_META_URL, $url );

	if ( '' !== $rating || $count > 0 || '' !== $url ) {
		delete_post_meta( $post_id, CA_GOOGLE_REVIEWS_META_LAST_ERROR );
	}
}

/**
 * Apply Google review data to GeoDirectory listings.
 *
 * @param object $post_detail Listing object.
 * @param int    $post_id     Post ID.
 * @return object
 */
function ca_google_reviews_filter_post_info( $post_detail, $post_id ) {
	if ( ! is_object( $post_detail ) || empty( $post_detail->post_type ) || 'gd_place' !== $post_detail->post_type ) {
		return $post_detail;
	}

	$data = ca_google_reviews_get_stored_data( $post_id );

	$post_detail->ca_google_reviews_place_id  = $data['place_id'];
	$post_detail->ca_google_reviews_rating    = '' !== $data['rating'] ? (float) $data['rating'] : 0;
	$post_detail->ca_google_reviews_count     = '' !== $data['count'] ? (int) $data['count'] : 0;
	$post_detail->ca_google_reviews_url       = $data['url'];
	$post_detail->ca_google_reviews_synced_at = $data['synced_at'];
	$post_detail->ca_google_reviews_has_data  = '' !== $data['rating'] && '' !== $data['count'];
	$post_detail->ca_google_reviews_preferred = ca_google_reviews_prefer_google();

	if ( $post_detail->ca_google_reviews_preferred ) {
		if ( $post_detail->ca_google_reviews_has_data ) {
			$post_detail->overall_rating = (float) $data['rating'];
			$post_detail->rating_count   = (int) $data['count'];
		} else {
			$post_detail->overall_rating = 0;
			$post_detail->rating_count   = 0;
		}
	}

	return $post_detail;
}

/**
 * Adjust the rating title when Google is the active source.
 *
 * @param string $title  Existing title.
 * @param float  $rating Rating.
 * @param array  $args   Rating args.
 * @return string
 */
function ca_google_reviews_filter_rating_title( $title, $rating, $args ) {
	global $gd_post;

	if ( empty( $gd_post ) || empty( $gd_post->ca_google_reviews_preferred ) ) {
		return $title;
	}

	if ( ! empty( $gd_post->ca_google_reviews_has_data ) ) {
		return sprintf(
			'Google rating: %1$s from %2$s reviews',
			number_format( (float) $gd_post->overall_rating, 1 ),
			number_format_i18n( (int) $gd_post->rating_count )
		);
	}

	return 'Google rating unavailable';
}

/**
 * Adjust the rating label when Google is the active source.
 *
 * @param string $label Existing label.
 * @return string
 */
function ca_google_reviews_filter_rating_label( $label ) {
	global $gd_post;

	if ( empty( $gd_post ) || empty( $gd_post->ca_google_reviews_preferred ) ) {
		return $label;
	}

	return 'Google rating';
}

/**
 * Handle bulk sync.
 */
function ca_google_reviews_handle_sync_all() {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( 'You do not have permission to do that.' );
	}

	check_admin_referer( 'ca_google_reviews_sync_all' );

	$api_key_error = ca_google_reviews_validate_api_key( ca_google_reviews_get_api_key() );

	if ( is_wp_error( $api_key_error ) ) {
		ca_google_reviews_redirect_with_notice(
			admin_url( 'options-general.php?page=ca-google-reviews' ),
			'error',
			$api_key_error->get_error_message()
		);
	}

	$posts = ca_google_reviews_get_syncable_post_ids();

	$successes = 0;
	$failures  = 0;
	$error_counts = array();

	foreach ( $posts as $post_id ) {
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
		'Google sync finished. %1$d listing(s) synced, %2$d failed.',
		$successes,
		$failures
	);

	if ( $failures && ! empty( $error_counts ) ) {
		arsort( $error_counts );
		$top_error = (string) key( $error_counts );

		if ( '' !== $top_error ) {
			$message .= ' Most common failure: ' . $top_error;
		}
	}

	ca_google_reviews_redirect_with_notice(
		admin_url( 'options-general.php?page=ca-google-reviews' ),
		$failures ? 'warning' : 'success',
		$message
	);
}

/**
 * Handle single-listing sync.
 */
function ca_google_reviews_handle_sync_single() {
	$post_id = isset( $_GET['post_id'] ) ? absint( $_GET['post_id'] ) : 0;

	if ( ! $post_id || ! current_user_can( 'edit_post', $post_id ) ) {
		wp_die( 'You do not have permission to do that.' );
	}

	check_admin_referer( 'ca_google_reviews_sync_single_' . $post_id );

	$result = ca_google_reviews_sync_listing( $post_id );
	$target = add_query_arg(
		array(
			'post'   => $post_id,
			'action' => 'edit',
		),
		admin_url( 'post.php' )
	);

	if ( is_wp_error( $result ) ) {
		ca_google_reviews_redirect_with_notice( $target, 'error', $result->get_error_message() );
	}

	ca_google_reviews_redirect_with_notice(
		$target,
		'success',
		sprintf(
			'Google rating synced: %1$s from %2$s reviews.',
			number_format( (float) $result['rating'], 1 ),
			number_format_i18n( (int) $result['count'] )
		)
	);
}

/**
 * Sync a single listing from Google Places.
 *
 * @param int $post_id Post ID.
 * @return array|WP_Error
 */
function ca_google_reviews_sync_listing( $post_id ) {
	$api_key = ca_google_reviews_get_api_key();

	$api_key_error = ca_google_reviews_validate_api_key( $api_key );

	if ( is_wp_error( $api_key_error ) ) {
		return ca_google_reviews_store_error( $post_id, $api_key_error );
	}

	$place_id = trim( (string) get_post_meta( $post_id, CA_GOOGLE_REVIEWS_META_PLACE_ID, true ) );

	if ( '' === $place_id ) {
		$query = ca_google_reviews_build_text_query( $post_id );

		if ( '' === $query ) {
			return ca_google_reviews_store_error( $post_id, new WP_Error( 'missing_query', 'The listing is missing the address data needed for Google lookup.' ) );
		}

		$find_result = ca_google_reviews_request(
			'POST',
			'https://places.googleapis.com/v1/places:searchText',
			array(
				'textQuery' => $query,
				'pageSize'  => 1,
			),
			array(
				'X-Goog-FieldMask' => 'places.id,places.displayName,places.formattedAddress',
			)
		);

		if ( is_wp_error( $find_result ) ) {
			return ca_google_reviews_store_error( $post_id, $find_result );
		}

		if ( empty( $find_result['places'][0]['id'] ) ) {
			return ca_google_reviews_store_error( $post_id, new WP_Error( 'place_not_found', 'Google could not find a matching place for this listing.' ) );
		}

		$place_id = sanitize_text_field( $find_result['places'][0]['id'] );
		update_post_meta( $post_id, CA_GOOGLE_REVIEWS_META_PLACE_ID, $place_id );
	}

	$details = ca_google_reviews_request(
		'GET',
		'https://places.googleapis.com/v1/places/' . rawurlencode( $place_id ),
		array(),
		array(
			'X-Goog-FieldMask' => 'id,displayName,formattedAddress,rating,userRatingCount,googleMapsUri',
		)
	);

	if ( is_wp_error( $details ) ) {
		return ca_google_reviews_store_error( $post_id, $details );
	}

	if ( ! is_array( $details ) || empty( $details['id'] ) ) {
		return ca_google_reviews_store_error( $post_id, new WP_Error( 'missing_result', 'Google did not return a place details result.' ) );
	}

	$result = $details;
	$rating = isset( $result['rating'] ) ? ca_google_reviews_sanitize_rating( $result['rating'] ) : '';
	$count  = isset( $result['userRatingCount'] ) ? absint( $result['userRatingCount'] ) : '';
	$url    = isset( $result['googleMapsUri'] ) ? esc_url_raw( $result['googleMapsUri'] ) : '';

	if ( '' === $rating || '' === $count ) {
		return ca_google_reviews_store_error( $post_id, new WP_Error( 'missing_rating', 'Google returned the place, but not a usable rating or review count.' ) );
	}

	update_post_meta( $post_id, CA_GOOGLE_REVIEWS_META_RATING, $rating );
	update_post_meta( $post_id, CA_GOOGLE_REVIEWS_META_COUNT, $count );
	ca_google_reviews_update_or_delete_meta( $post_id, CA_GOOGLE_REVIEWS_META_URL, $url );
	update_post_meta( $post_id, CA_GOOGLE_REVIEWS_META_SYNCED_AT, current_time( 'mysql' ) );
	delete_post_meta( $post_id, CA_GOOGLE_REVIEWS_META_LAST_ERROR );

	return array(
		'place_id' => $place_id,
		'rating'   => $rating,
		'count'    => $count,
		'url'      => $url,
	);
}

/**
 * Build the text query used for Google lookup.
 *
 * @param int $post_id Post ID.
 * @return string
 */
function ca_google_reviews_build_text_query( $post_id ) {
	$post = geodir_get_post_info( $post_id );

	if ( ! is_object( $post ) ) {
		return '';
	}

	$parts = array_filter(
		array(
			isset( $post->post_title ) ? $post->post_title : '',
			isset( $post->street ) ? $post->street : '',
			isset( $post->street2 ) ? $post->street2 : '',
			isset( $post->city ) ? $post->city : '',
			isset( $post->region ) ? $post->region : '',
			isset( $post->zip ) ? $post->zip : '',
			isset( $post->country ) ? $post->country : '',
		)
	);

	return trim( implode( ', ', $parts ) );
}

/**
 * Perform a Google Places request.
 *
 * @param string $method   HTTP method.
 * @param string $endpoint API endpoint.
 * @param array  $data     Request data.
 * @param array  $headers  Request headers.
 * @return array|WP_Error
 */
function ca_google_reviews_request( $method, $endpoint, array $data = array(), array $headers = array() ) {
	$method = strtoupper( (string) $method );
	$args   = array(
		'method'  => $method,
		'timeout' => 20,
		'headers' => array_merge(
			array(
				'Content-Type' => 'application/json',
				'X-Goog-Api-Key' => ca_google_reviews_get_api_key(),
			),
			$headers
		),
	);

	if ( 'GET' === $method && ! empty( $data ) ) {
		$endpoint = add_query_arg( $data, $endpoint );
	} elseif ( ! empty( $data ) ) {
		$args['body'] = wp_json_encode( $data );
	}

	$response = wp_remote_request( $endpoint, $args );

	if ( is_wp_error( $response ) ) {
		return $response;
	}

	$code = wp_remote_retrieve_response_code( $response );
	$body = wp_remote_retrieve_body( $response );
	$data = json_decode( $body, true );

	if ( ! is_array( $data ) ) {
		return new WP_Error( 'google_http_error', 'Google Places returned an unreadable response.' );
	}

	if ( $code < 200 || $code >= 300 ) {
		$message = ! empty( $data['error']['message'] ) ? (string) $data['error']['message'] : 'Google Places returned an unexpected response.';
		return new WP_Error( 'google_http_error', $message );
	}

	if ( ! empty( $data['error']['message'] ) ) {
		return new WP_Error( 'google_places_error', (string) $data['error']['message'] );
	}

	return $data;
}

/**
 * Get stored Google review data for a listing.
 *
 * @param int $post_id Post ID.
 * @return array
 */
function ca_google_reviews_get_stored_data( $post_id ) {
	return array(
		'place_id'   => trim( (string) get_post_meta( $post_id, CA_GOOGLE_REVIEWS_META_PLACE_ID, true ) ),
		'rating'     => trim( (string) get_post_meta( $post_id, CA_GOOGLE_REVIEWS_META_RATING, true ) ),
		'count'      => trim( (string) get_post_meta( $post_id, CA_GOOGLE_REVIEWS_META_COUNT, true ) ),
		'url'        => trim( (string) get_post_meta( $post_id, CA_GOOGLE_REVIEWS_META_URL, true ) ),
		'synced_at'  => trim( (string) get_post_meta( $post_id, CA_GOOGLE_REVIEWS_META_SYNCED_AT, true ) ),
		'last_error' => trim( (string) get_post_meta( $post_id, CA_GOOGLE_REVIEWS_META_LAST_ERROR, true ) ),
	);
}

/**
 * Render admin notices for sync actions.
 */
function ca_google_reviews_render_admin_notice() {
	if ( empty( $_GET['ca_google_reviews_notice'] ) || empty( $_GET['ca_google_reviews_message'] ) ) {
		return;
	}

	$status  = isset( $_GET['ca_google_reviews_notice'] ) ? sanitize_key( wp_unslash( $_GET['ca_google_reviews_notice'] ) ) : 'success';
	$message = sanitize_text_field( wp_unslash( $_GET['ca_google_reviews_message'] ) );
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
 * Get the configured API key.
 *
 * @param bool $allow_constant Whether constants are allowed.
 * @return string
 */
function ca_google_reviews_get_api_key( $allow_constant = true ) {
	if ( $allow_constant && defined( 'CA_GOOGLE_REVIEWS_API_KEY' ) && CA_GOOGLE_REVIEWS_API_KEY ) {
		return trim( (string) CA_GOOGLE_REVIEWS_API_KEY );
	}

	return trim( (string) get_option( CA_GOOGLE_REVIEWS_OPTION_API_KEY, '' ) );
}

/**
 * Sanitize the API key setting.
 *
 * @param mixed $value Raw value.
 * @return string
 */
function ca_google_reviews_sanitize_api_key( $value ) {
	$value = trim( sanitize_text_field( (string) $value ) );

	if ( '' === $value ) {
		return '';
	}

	$error = ca_google_reviews_validate_api_key( $value );

	if ( is_wp_error( $error ) ) {
		add_settings_error(
			CA_GOOGLE_REVIEWS_OPTION_API_KEY,
			'invalid_google_reviews_api_key',
			$error->get_error_message()
		);
	}

	return $value;
}

/**
 * Validate the configured API key.
 *
 * @param string $api_key API key.
 * @return true|WP_Error
 */
function ca_google_reviews_validate_api_key( $api_key ) {
	$api_key = trim( (string) $api_key );

	if ( '' === $api_key ) {
		return new WP_Error( 'missing_api_key', 'Add a Google Places API key before running sync.' );
	}

	if ( 0 !== strpos( $api_key, 'AIza' ) ) {
		return new WP_Error( 'invalid_api_key_format', 'The configured Google Places API key looks invalid. It should usually start with "AIza".' );
	}

	return true;
}

/**
 * Whether Google ratings should replace GeoDirectory ratings.
 *
 * @return bool
 */
function ca_google_reviews_prefer_google() {
	return (bool) get_option( CA_GOOGLE_REVIEWS_OPTION_PREFER, 1 );
}

/**
 * Redirect with a notice message.
 *
 * @param string $url     Redirect URL.
 * @param string $status  Notice status.
 * @param string $message Notice message.
 */
function ca_google_reviews_redirect_with_notice( $url, $status, $message ) {
	wp_safe_redirect(
		add_query_arg(
			array(
				'ca_google_reviews_notice'  => $status,
				'ca_google_reviews_message' => $message,
			),
			$url
		)
	);
	exit;
}

/**
 * Store an error against a listing and return it.
 *
 * @param int      $post_id Post ID.
 * @param WP_Error $error   Error object.
 * @return WP_Error
 */
function ca_google_reviews_store_error( $post_id, WP_Error $error ) {
	update_post_meta( $post_id, CA_GOOGLE_REVIEWS_META_LAST_ERROR, $error->get_error_message() );
	return $error;
}

/**
 * Update or delete post meta depending on the value.
 *
 * @param int    $post_id Post ID.
 * @param string $key     Meta key.
 * @param mixed  $value   Meta value.
 */
function ca_google_reviews_update_or_delete_meta( $post_id, $key, $value ) {
	if ( '' === $value || null === $value ) {
		delete_post_meta( $post_id, $key );
		return;
	}

	update_post_meta( $post_id, $key, $value );
}

/**
 * Sanitize the checkbox setting.
 *
 * @param mixed $value Raw value.
 * @return int
 */
function ca_google_reviews_sanitize_checkbox( $value ) {
	return empty( $value ) ? 0 : 1;
}

/**
 * Sanitize rating values.
 *
 * @param mixed $value Raw rating.
 * @return string
 */
function ca_google_reviews_sanitize_rating( $value ) {
	if ( '' === $value || null === $value ) {
		return '';
	}

	$rating = max( 0, min( 5, (float) $value ) );
	return number_format( $rating, 1, '.', '' );
}

/**
 * Get sync stats for the settings page.
 *
 * @return array
 */
function ca_google_reviews_get_sync_stats() {
	$posts = ca_google_reviews_get_syncable_post_ids();

	$synced = 0;

	foreach ( $posts as $post_id ) {
		$data = ca_google_reviews_get_stored_data( (int) $post_id );
		if ( '' !== $data['rating'] && '' !== $data['count'] ) {
			$synced++;
		}
	}

	return array(
		'total'   => count( $posts ),
		'synced'  => $synced,
	);
}

/**
 * Get listing IDs eligible for review sync.
 *
 * @return int[]
 */
function ca_google_reviews_get_syncable_post_ids() {
	return get_posts(
		array(
			'post_type'        => 'gd_place',
			'post_status'      => array( 'publish', 'pending', 'draft', 'future', 'private' ),
			'fields'           => 'ids',
			'numberposts'      => -1,
			'suppress_filters' => false,
		)
	);
}

from google.cloud import bigquery
from google.cloud import pubsub_v1
import json

report_query = f'''
SELECT
video_id
FROM
`regrets-reporter-dev.regrets_reporter_analysis.priority_vids_next`
WHERE
video_id not in (select video_id from `regrets-reporter-dev.regrets_reporter_analysis.yt_api_data_v9_filled`)
GROUP BY video_id
limit
'''


# Download a table
def download_table(bq_table_uri: str, num_rows: str):
    bq_client = bigquery.Client()

    # Remove bq:// prefix if present
    prefix = "bq://"
    if bq_table_uri.startswith(prefix):
        bq_table_uri = bq_table_uri[len(prefix) :]

    table = bigquery.TableReference.from_string(bq_table_uri)
    rows = bq_client.query(report_query + str(num_rows))
    return rows.to_dataframe()


def get_video_ids(request):
	project_id = "regrets-reporter-dev"

	PROXY_1 = "proxy_1"
	PROXY_2 = "proxy_2"

	proxies = [PROXY_1, PROXY_2]

	publisher = pubsub_v1.PublisherClient()

	topic_name_proxy_1 = "video-ids"
	topic_path_proxy_1 = publisher.topic_path(project_id, topic_name_proxy_1)

	topic_name_prpxy_2 = "video-ids-proxy-2"
	topic_path_proxy_2 = publisher.topic_path(project_id, topic_name_prpxy_2)
	proxy_topics = [topic_path_proxy_1, topic_path_proxy_2]

	request_json = request.get_json()
	print(f"Received json: {request_json}")
	if request_json and 'num_rows' in request_json:
		num_rows = request_json['num_rows']

	print(f"retrieving {num_rows} video_ids")
	BQ_SOURCE = "bq://regrets-reporter-dev.regrets_reporter_ucs_stable.video_data_v1"
	dataframe = download_table(BQ_SOURCE, num_rows)

	video_ids = dataframe['video_id'].tolist()

	# TODO Need to batch publish the video_ids

	for index, video_id in enumerate(video_ids):
		msg = {'video_id': video_id, 'proxy_name': proxies[index % 2]}
		json_text = json.dumps(msg, ensure_ascii=False)
		future = publisher.publish(proxy_topics[index % 2], data=json_text.encode())
	return {"num_video_ids": len(video_ids), "video_ids": video_ids}, 200

import os
import psycopg2
from flask import Flask, request, jsonify, send_from_directory
from werkzeug.exceptions import BadRequest, HTTPException
from celadon.db import Database
from celadon.application import Application
from celadon.models import Customer, Item, Purchase, Purchaser, Sale


def _create_connection():
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        raise EnvironmentError('DATABASE_URL environment variable is not set')
    conn = psycopg2.connect(dsn=database_url)
    conn.set_session(autocommit=True)
    return conn


def create_server(connection=None, database=None, application=None):
    if application is None:
        if database is None:
            if connection is None:
                connection = _create_connection()
            database = Database(connection)
        application = Application(database)

    flask_server = Flask(__name__, static_folder='static', static_url_path='')
    flask_server.app = application

    return flask_server


server = create_server()


@server.errorhandler(HTTPException)
def handle_http_exception(e):
    return jsonify({'error': str(e.description)}), e.code


def get_request_json():
    body = request.get_json(force=True, silent=True)
    if body is None:
        raise BadRequest('Request body must be valid JSON')
    return body


@server.route('/')
def index():
    return send_from_directory(server.static_folder, 'index.html')


@server.route('/purchaser', methods=['GET', 'POST'])
@server.route('/purchaser/<int:purchaser_id>', methods=['GET', 'PUT'])
def purchaser(purchaser_id=None):
    if purchaser_id is None:
        if request.method == 'POST':
            return jsonify(server.app.add_purchaser(Purchaser.from_dict(get_request_json()))), 201
        else:
            return jsonify(server.app.get_purchasers())
    else:
        if request.method == 'PUT':
            p = Purchaser.from_dict(get_request_json())
            p.id = purchaser_id
            return jsonify(server.app.update_purchaser(p))
        else:
            return jsonify(server.app.get_purchaser(purchaser_id))


@server.route('/purchase', methods=['GET', 'POST'])
@server.route('/purchase/<int:purchase_id>', methods=['GET', 'PUT'])
def purchase(purchase_id=None):
    if purchase_id is None:
        if request.method == 'POST':
            return jsonify(server.app.add_purchase(Purchase.from_dict(get_request_json()))), 201
        else:
            return jsonify(server.app.get_purchases())
    else:
        if request.method == 'PUT':
            p = Purchase.from_dict(get_request_json())
            p.id = purchase_id
            return jsonify(server.app.update_purchase(p))
        else:
            return jsonify(server.app.get_purchase(purchase_id))


@server.route('/customer', methods=['GET', 'POST'])
@server.route('/customer/<int:customer_id>', methods=['GET', 'PUT'])
def customer(customer_id=None):
    if customer_id is None:
        if request.method == 'POST':
            return jsonify(server.app.add_customer(Customer.from_dict(get_request_json()))), 201
        else:
            return jsonify(server.app.get_customers())
    else:
        if request.method == 'PUT':
            c = Customer.from_dict(get_request_json())
            c.id = customer_id
            return jsonify(server.app.update_customer(c))
        else:
            return jsonify(server.app.get_customer(customer_id))


@server.route('/sale', methods=['GET', 'POST'])
@server.route('/sale/<int:sale_id>', methods=['GET', 'PUT'])
def sale(sale_id=None):
    if sale_id is None:
        if request.method == 'POST':
            return jsonify(server.app.add_sale(Sale.from_dict(get_request_json()))), 201
        else:
            return jsonify(server.app.get_sales())
    else:
        if request.method == 'PUT':
            s = Sale.from_dict(get_request_json())
            s.id = sale_id
            return jsonify(server.app.update_sale(s))
        else:
            return jsonify(server.app.get_sale(sale_id))


@server.route('/item', methods=['GET'])
@server.route('/item/<int:item_id>', methods=['GET', 'PUT'])
def item(item_id=None):
    if item_id is None:
        return jsonify(server.app.get_items())
    else:
        if request.method == 'PUT':
            i = Item.from_dict(get_request_json())
            i.id = item_id
            return jsonify(server.app.update_item(i))
        else:
            return jsonify(server.app.get_item(item_id))

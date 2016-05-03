# -*- coding: utf-8 -*-
#
# Copyright (©) 2016, Beatriz Ferreira <beatriz.216@hotmail.com>
#
#  This program is free software: you can redistribute it and/or modify
#  it under the terms of the GNU Affero General Public License as
#  published by the Free Software Foundation, either version 3 of the
#  License, or (at your option) any later version.
#
#  This program is distributed in the hope that it will be useful,
#  but WITHOUT ANY WARRANTY; without even the implied warranty of
#  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#  GNU Affero General Public License for more details.
#
#  You should have received a copy of the GNU Affero General Public License
#  along with this program.  If not, see <http://www.gnu.org/licenses/>.


from basecollector import BaseCollector
from django.test import TestCase

class BaseCollectorTestCase(TestCase):
    def test_normalize_party_name(self):
        collector = BaseCollector([], True)
        self.assertEquals(collector._normalize_party_name('PCdoB'), 'PC do B')

    def test_normalize_party_name_out_of_list(self):
        collector = BaseCollector([], True)
        self.assertEquals(collector._normalize_party_name('PMDB'), 'PMDB')
